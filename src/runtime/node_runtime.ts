import type { ComplianceDecision } from '../distributed/cluster_compliance_engine';
import { deriveComplianceDecisionId } from '../distributed/cluster_compliance_executor';
import { createInitialClusterState } from '../distributed/cluster_lifecycle_engine';
import { stableStringify } from '../logging/audit';

import { createDeterministicClock } from './clock/deterministic_clock';
import { GossipEngine } from './gossip/gossip_engine';
import { assertDeterministicSerialization, assertNoInputMutation, assertSerializable } from './invariants/runtime_invariants';
import { NodeLifecycle } from './node_lifecycle';
import type { NodeConfig } from './node_config';
import { parseNodeConfigFromArgv } from './node_config';
import { RuntimeHttpClient } from './network/http_client';
import { RuntimeHttpServer } from './network/http_server';
import { RuntimeLogger } from './ops/logger';
import { buildAuditProof, type AuditProof } from './ops/audit_proof';
import { computeStateHash } from './ops/state_inspector';
import { StorageEngine } from './persistence/storage_engine';
import { ExecutionQueue } from './queue/execution_queue';
import { replayDeterministically } from './execution/replay_engine';
import type { RuntimeDecision } from './execution/decision_types';

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export class IRISNodeRuntime {
  private readonly lifecycle = new NodeLifecycle();
  private readonly storage: StorageEngine;
  private readonly clock;
  private readonly execution: ExecutionQueue;
  private readonly httpClient: RuntimeHttpClient;
  private readonly httpServer: RuntimeHttpServer;
  private readonly gossip: GossipEngine;
  private readonly logger: RuntimeLogger;

  constructor(config: NodeConfig) {
    this.logger = new RuntimeLogger(config.nodeId);
    this.storage = new StorageEngine(config.storagePath);
    this.clock = createDeterministicClock(config.deterministicMode);
    this.execution = new ExecutionQueue(createInitialClusterState(config.nodeId), this.storage, this.clock);
    this.httpClient = new RuntimeHttpClient({
      retryIntervalMs: config.retryIntervalMs,
      maxRetryAttempts: config.maxRetryAttempts,
    });
    this.httpServer = new RuntimeHttpServer(config.port, {
      onDecision: async (decision) => this.submitDecision(decision),
      onStateSync: async (state) => this.syncState(state),
      getHealth: () => {
        const snapshot = this.execution.snapshot();
        return Object.freeze({
          nodeId: config.nodeId,
          lifecycle: this.lifecycle.current,
          stateHash: computeStateHash(snapshot),
        });
      },
      getStateSnapshot: () => {
        const snapshot = this.execution.snapshot();
        const journalIds = this.execution.journalEntries().map((x) => x.decisionId);
        const lastDecisionId = journalIds[journalIds.length - 1];
        return Object.freeze({
          nodeId: config.nodeId,
          stateHash: computeStateHash(snapshot),
          executionJournalSize: journalIds.length,
          executionJournalIds: Object.freeze(journalIds),
          executedActions: Object.freeze([...(snapshot.executedActions ?? [])]),
          lastDecisionId: lastDecisionId ?? null,
          timestamp: snapshot.executionTimestamp ?? 0,
        });
      },
      getCanonicalOrder: () => {
        const journal = this.execution.journalEntries();
        const orderedEvents = journal.map((x) => x.decision);
        return Object.freeze({
          orderedEvents: Object.freeze(orderedEvents),
          hash: computeStateHash(stableStringify(orderedEvents)),
        });
      },
      verifyReplay: (eventLog) => {
        const current = this.execution.auditProof();
        const reconstructed = eventLog
          .map((x) => x as ComplianceDecision)
          .map((decision, i) => Object.freeze({
            decisionId: deriveComplianceDecisionId(decision),
            decision,
            executionTimestamp: i + 1,
          }));
        const replayState = replayDeterministically(createInitialClusterState(config.nodeId), reconstructed);
        const proof = buildAuditProof(reconstructed, replayState);
        return Object.freeze({
          match:
            proof.canonicalEventHash === current.canonicalEventHash
            && proof.decisionSequenceHash === current.decisionSequenceHash
            && proof.replayStateHash === current.replayStateHash,
          stateHash: computeStateHash(replayState),
          proof,
        });
      },
      getAuditProof: (): Readonly<AuditProof> => this.execution.auditProof(),
    });
    this.gossip = new GossipEngine(config.peers, config.gossipIntervalMs, this.httpClient, {
      currentState: () => this.execution.snapshot(),
      recentDecisions: () => this.execution.recentDecisions(),
    });
  }

  async start(): Promise<void> {
    this.lifecycle.beginStart();
    await this.execution.recover();
    await this.httpServer.start();
    this.gossip.start();
    this.lifecycle.markRunning();
    this.logger.log('INFO', 'START', this.execution.snapshot());
  }

  async stop(): Promise<void> {
    this.lifecycle.beginStop();
    this.gossip.stop();
    await this.httpServer.stop();
    this.lifecycle.markStopped();
    this.logger.log('INFO', 'STOP', this.execution.snapshot());
  }

  async submitDecision(runtimeDecision: ComplianceDecision | RuntimeDecision): Promise<void> {
    const decision = 'decision' in (runtimeDecision as unknown as Record<string, unknown>)
      ? (runtimeDecision as RuntimeDecision).decision
      : (runtimeDecision as ComplianceDecision);
    const before = deepClone(runtimeDecision);
    await this.execution.submitDecision(deepClone(runtimeDecision));
    assertNoInputMutation(before, runtimeDecision);
    assertSerializable(this.execution.snapshot());
    assertDeterministicSerialization(this.execution.snapshot());
    const snapshot = this.execution.snapshot();
    this.logger.log(
      'INFO',
      'EXECUTE',
      snapshot,
      snapshot.complianceDecision !== undefined ? deriveComplianceDecisionId(snapshot.complianceDecision) : undefined,
    );
  }

  async syncState(state: ReturnType<ExecutionQueue['snapshot']>): Promise<void> {
    const before = deepClone(state);
    await this.execution.mergeRemoteState(deepClone(state));
    assertNoInputMutation(before, state);
    assertSerializable(this.execution.snapshot());
    assertDeterministicSerialization(this.execution.snapshot());
    this.logger.log('INFO', 'STATE_SYNC', this.execution.snapshot());
  }
}

function parseCliAndRun(argv: readonly string[]): void {
  const config = parseNodeConfigFromArgv(argv);
  const runtime = new IRISNodeRuntime(config);
  void runtime.start();
  const shutdown = async (): Promise<void> => {
    await runtime.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  parseCliAndRun(process.argv.slice(2));
}
