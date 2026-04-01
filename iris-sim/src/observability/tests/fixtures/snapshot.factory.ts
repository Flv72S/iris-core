import type { IrisObservabilitySnapshot } from '../../observability_contract.js';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown>
    ? DeepPartial<T[K]>
    : T[K] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : T[K];
};

function mergeDeep<T>(base: T, patch?: DeepPartial<T>): T {
  if (patch == null) return base;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if (v === undefined) continue;
    const current = out[k];
    if (Array.isArray(v)) {
      out[k] = [...v];
    } else if (v != null && typeof v === 'object' && current != null && typeof current === 'object' && !Array.isArray(current)) {
      out[k] = mergeDeep(current, v as any);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export function createValidSnapshot(
  patch?: DeepPartial<IrisObservabilitySnapshot>,
): IrisObservabilitySnapshot {
  const base: IrisObservabilitySnapshot = {
    node: {
      id: 'node-a',
      timestamp: 1700000000000,
      uptime_seconds: 12,
    },
    metrics: {
      nodeId: 'node-a',
      timestamp: '2026-03-27T00:00:00.000Z',
      metrics: {
        'runtime.state': 1,
        'runtime.errors': 0,
        'runtime.active_components': 6,
        'runtime.component.count': 6,
        messages_sent: 2,
      },
    },
    runtime: {
      state: 'RUNNING',
      updatedAt: '2026-03-27T00:00:00.000Z',
      errors: 0,
      activeComponents: 6,
      activeComponentsList: [
        'crdt',
        'federation',
        'gossip',
        'identity',
        'observability',
        'transport',
      ],
      lastInitPhase: 'observability',
      lastInitPhaseStatus: 'OK',
    },
    federation: {
      domainId: 'local',
      peersByDomain: {},
      rejectedByPolicy: 0,
      domainsRegistered: ['local'],
    },
    transport: {
      activeConnections: 0,
      activeSessions: 0,
      rekeys: 0,
      rejectedConnections: 0,
      rateLimited: 0,
      failedHandshakes: 0,
      replayAttacksDetected: 0,
      pfsSessions: 0,
      pfsFallbacks: 0,
      pfsStrictSessions: 0,
      pfsRejected: 0,
      pfsDowngradeAttempts: 0,
      sessionExpired: 0,
      rekeyTriggeredTime: 0,
      rekeyTriggeredData: 0,
      sessionTerminated: 0,
      rekeyCollisions: 0,
      rekeyCooldownBlocked: 0,
      dualKeyActive: 0,
      replayDetected: 0,
    },
    gossip: {
      messagesReceived: 1,
      messagesForwarded: 1,
      duplicatesDropped: 0,
      rateLimited: 0,
      blockedAmplifications: 0,
      inflightLimitExceeded: 0,
      policyViolations: 0,
      lineageInvalid: 0,
      replayDetected: 0,
      convergenceStalled: 0,
    },
    gossipControl: {
      inflight: 0,
      blockedAmplifications: 0,
      fanoutAverage: 2,
    },
    gossipConsistency: {
      convergenceRate: 1,
      partialMessages: 0,
    },
    crdt: {
      operationsApplied: 2,
      operationsRejected: 0,
      conflictsResolved: 0,
      stateSize: 128,
      convergenceRate: 1,
    },
  };

  return mergeDeep(base, patch);
}

export function cloneSnapshot(snapshot: IrisObservabilitySnapshot): IrisObservabilitySnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as IrisObservabilitySnapshot;
}

