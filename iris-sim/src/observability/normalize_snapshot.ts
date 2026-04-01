import type { IrisObservabilitySnapshot } from './observability_contract.js';

function sortNumericRecord(input: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(input).sort()) out[k] = input[k]!;
  return out;
}

const VOLATILE_METRIC_KEYS = new Set(['runtime.boot.time', 'runtime.init.phase.duration', 'node_uptime_seconds']);

function sortStrings(input: readonly string[] | undefined): string[] | undefined {
  if (input === undefined) return undefined;
  return [...input].sort();
}

/**
 * Build a deterministic, comparable view of an observability snapshot.
 * Removes volatile fields and keeps convergence-relevant state.
 */
export function normalizeSnapshot(s: IrisObservabilitySnapshot): Record<string, unknown> {
  const stableMetrics: Record<string, number> = {};
  for (const [k, v] of Object.entries(s.metrics.metrics)) {
    if (!VOLATILE_METRIC_KEYS.has(k)) stableMetrics[k] = v;
  }
  return {
    federationEnabled: s.federation != null,
    runtime: s.runtime
      ? {
          state: s.runtime.state,
          errors: s.runtime.errors,
          activeComponents: s.runtime.activeComponents,
          ...(s.runtime.activeComponentsList !== undefined
            ? { activeComponentsList: sortStrings(s.runtime.activeComponentsList) }
            : {}),
          ...(s.runtime.lastInitPhase ? { lastInitPhase: s.runtime.lastInitPhase } : {}),
          ...(s.runtime.lastInitPhaseStatus ? { lastInitPhaseStatus: s.runtime.lastInitPhaseStatus } : {}),
          ...(s.runtime.lastInitErrorPhase ? { lastInitErrorPhase: s.runtime.lastInitErrorPhase } : {}),
        }
      : undefined,
    metrics: {
      metrics: sortNumericRecord(stableMetrics),
      nodeId: s.metrics.nodeId,
      // omit metrics.timestamp (volatile)
    },
    federation: s.federation
      ? {
          domainId: s.federation.domainId,
          rejectedByPolicy: s.federation.rejectedByPolicy,
          peersByDomain: s.federation.peersByDomain,
          ...(s.federation.domainsRegistered !== undefined
            ? { domainsRegistered: sortStrings(s.federation.domainsRegistered) }
            : {}),
        }
      : undefined,
    transport: s.transport,
    gossip: s.gossip,
    gossipControl: s.gossipControl,
    gossipConsistency: s.gossipConsistency,
    crdt: s.crdt,
  };
}

