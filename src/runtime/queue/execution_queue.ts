import type { ComplianceDecision } from '../../distributed/cluster_compliance_engine';
import { deriveComplianceDecisionId } from '../../distributed/cluster_compliance_executor';
import type { ClusterState } from '../../distributed/cluster_lifecycle_engine';
import type { RuntimeDecision } from '../execution/decision_types';
import type { DeterministicClock } from '../clock/deterministic_clock';
import { replayDeterministically, sortStoredDecisionsCanonical } from '../execution/replay_engine';
import { buildAuditProof, type AuditProof } from '../ops/audit_proof';
import type { StoredDecision } from '../persistence/file_store';
import type { StorageEngine } from '../persistence/storage_engine';
import { EventQueue } from './event_queue';

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export class ExecutionQueue {
  private readonly queue = new EventQueue();
  private readonly initialState: ClusterState;
  private state: ClusterState;
  private readonly recent: ComplianceDecision[] = [];
  private journal: StoredDecision[] = [];
  private journalIds = new Set<string>();

  constructor(
    initialState: ClusterState,
    private readonly storage: StorageEngine,
    private readonly clock: DeterministicClock,
  ) {
    this.initialState = deepClone(initialState);
    this.state = deepClone(initialState);
  }

  snapshot(): ClusterState {
    return deepClone(this.state);
  }

  recentDecisions(): readonly ComplianceDecision[] {
    return Object.freeze([...this.recent]);
  }

  journalEntries(): readonly StoredDecision[] {
    return sortStoredDecisionsCanonical(this.journal);
  }

  auditProof(): AuditProof {
    return buildAuditProof(this.journalEntries(), this.state);
  }

  async recover(): Promise<void> {
    const data = await this.storage.load(this.initialState);
    const ordered = sortStoredDecisionsCanonical(data.journal);
    this.journal = [...data.journal];
    this.journalIds = new Set(this.journal.map((x) => x.decisionId));
    this.state = replayDeterministically(this.initialState, ordered);
    await this.storage.writeSnapshot(this.state, this.journal.length);
  }

  submitDecision(runtimeDecision: ComplianceDecision | RuntimeDecision): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.enqueue(async () => {
        try {
          const canonical = deepClone('decision' in (runtimeDecision as Record<string, unknown>)
            ? (runtimeDecision as RuntimeDecision).decision
            : (runtimeDecision as ComplianceDecision));
          const decisionId = deriveComplianceDecisionId(canonical);
          if (this.journalIds.has(decisionId)) {
            resolve();
            return;
          }
          const executionTimestamp = this.clock.now();
          const stored: StoredDecision = Object.freeze({
            decisionId,
            decision: canonical,
            executionTimestamp,
          });
          await this.storage.appendDecision(stored);
          this.journal.push(stored);
          this.journalIds.add(decisionId);
          this.state = replayDeterministically(this.initialState, this.journal);
          this.recent.push(canonical);
          if (this.recent.length > 64) this.recent.shift();
          await this.storage.writeSnapshot(this.state, this.journal.length);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  mergeRemoteState(remote: ClusterState): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.enqueue(async () => {
        try {
          void remote;
          // Source of truth is local WAL journal. Remote state sync is intentionally non-authoritative.
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}
