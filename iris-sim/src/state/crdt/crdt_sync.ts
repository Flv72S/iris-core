import { securityLog } from '../../security/security_logger.js';
import type { GossipEngine } from '../../network/gossip/gossip_engine.js';
import type { NodeIsolationManager } from '../../control_plane/node_isolation.js';
import type { CRDTEngine } from './crdt_engine.js';
import type { CRDTOperation } from './crdt_types.js';
import { verifyCRDTOperation, enforceCRDTTrust } from './crdt_security.js';
import { computeMissingOps } from './crdt_delta.js';
import { incCRDTMetric, setCRDTMetric } from './crdt_metrics.js';

export class CRDTSyncBridge {
  private readonly engine: CRDTEngine;
  private readonly gossip: GossipEngine;
  private readonly keyResolver: (nodeId: string) => string | undefined;
  private readonly trustScoreProvider: ((nodeId: string) => number) | undefined;
  private readonly isolationManager: NodeIsolationManager | undefined;
  private readonly dedup = new Set<string>();
  private readonly seenAt = new Map<string, number>();
  private readonly now: () => number;
  private readonly replayTtlMs: number;
  private readonly minTrustScore: number;

  constructor(args: {
    engine: CRDTEngine;
    gossip: GossipEngine;
    keyResolver: (nodeId: string) => string | undefined;
    trustScoreProvider?: (nodeId: string) => number;
    isolationManager?: NodeIsolationManager;
    now?: () => number;
    replayTtlMs?: number;
    minTrustScore?: number;
  }) {
    this.engine = args.engine;
    this.gossip = args.gossip;
    this.keyResolver = args.keyResolver;
    this.trustScoreProvider = args.trustScoreProvider;
    this.isolationManager = args.isolationManager;
    this.now = args.now ?? Date.now;
    this.replayTtlMs = args.replayTtlMs ?? 60_000;
    this.minTrustScore = args.minTrustScore ?? 30;
  }

  publishCRDTOperation(op: CRDTOperation<any>): void {
    this.gossip.broadcast({
      payloadType: 'CUSTOM',
      payload: { topic: 'crdt', operation: op },
    });
  }

  receiveCRDTOperation(op: CRDTOperation<any>): boolean {
    this.gc();
    if (this.dedup.has(op.opId)) {
      securityLog('CRDT_REPLAY_DETECTED', { opId: op.opId, nodeId: op.nodeId });
      incCRDTMetric('operationsRejected', 1);
      return false;
    }
    const secret = this.keyResolver(op.nodeId);
    if (!secret || !verifyCRDTOperation(op, secret)) {
      securityLog('CRDT_SIGNATURE_INVALID', { opId: op.opId, nodeId: op.nodeId });
      incCRDTMetric('operationsRejected', 1);
      return false;
    }
    const trust = enforceCRDTTrust({
      nodeId: op.nodeId,
      minTrustScore: this.minTrustScore,
      ...(this.trustScoreProvider ? { trustScoreProvider: this.trustScoreProvider } : {}),
      ...(this.isolationManager ? { isolationManager: this.isolationManager } : {}),
    });
    if (!trust.ok) {
      securityLog('CRDT_TRUST_REJECTED', { opId: op.opId, nodeId: op.nodeId, reason: trust.reason });
      incCRDTMetric('operationsRejected', 1);
      return false;
    }
    this.engine.applyOperation(op);
    this.dedup.add(op.opId);
    this.seenAt.set(op.opId, this.now());
    setCRDTMetric('convergenceRate', 1);
    return true;
  }

  computeMissingDelta(remoteKnownOpIds: Set<string>): CRDTOperation<any>[] {
    return computeMissingOps(this.engine.getOperationLog(), remoteKnownOpIds);
  }

  private gc(): void {
    const now = this.now();
    for (const [opId, ts] of this.seenAt.entries()) {
      if (now - ts > this.replayTtlMs) {
        this.seenAt.delete(opId);
        this.dedup.delete(opId);
      }
    }
  }
}

