/**
 * Phase 11A — Deterministic conflict resolution: apply rules, resolve, generate resolution log.
 */

import { createConsensusAuditEntry } from '../logging/consensus_audit_log.js';
import type {
  AggregatedSnapshotSet,
  SnapshotConflictSet,
  ConflictResolutionLog,
  ConsensusParameters,
  NodeMetadata,
  SnapshotData,
} from '../types/consensus_engine_types.js';
import { CONSENSUS_ENGINE_SCHEMA_VERSION } from '../types/consensus_engine_types.js';
import { hashConsensusPayload } from '../hashing/consensus_hash.js';

export interface ResolutionOutcome {
  chosenSnapshot: SnapshotData;
  resolutionLog: ConflictResolutionLog;
}

/**
 * Build a map node_id -> NodeMetadata for lookup.
 */
function metadataByNode(metadata: readonly NodeMetadata[]): Map<string, NodeMetadata> {
  const m = new Map<string, NodeMetadata>();
  for (const n of metadata) m.set(n.node_id, n);
  return m;
}

/**
 * Sort snapshot indices by node priority (deterministic).
 * Higher reliability_weight first; then by node_id for tie-break.
 */
function orderByPriority(
  aggregated: AggregatedSnapshotSet,
  params: ConsensusParameters,
  metaMap: Map<string, NodeMetadata>
): SnapshotData[] {
  const list = [...aggregated.snapshots];
  if (params.node_priority_rules === 'timestamp') {
    list.sort((a, b) => a.timestamp - b.timestamp || a.node_id.localeCompare(b.node_id));
    return list;
  }
  if (params.node_priority_rules === 'reliability') {
    list.sort((a, b) => {
      const wa = metaMap.get(a.node_id)?.reliability_weight ?? 0;
      const wb = metaMap.get(b.node_id)?.reliability_weight ?? 0;
      if (wb !== wa) return wb - wa;
      return a.node_id.localeCompare(b.node_id);
    });
    return list;
  }
  if (params.node_priority_rules === 'trust_anchor') {
    list.sort((a, b) => {
      const ta = metaMap.get(a.node_id)?.trust_anchor ?? '';
      const tb = metaMap.get(b.node_id)?.trust_anchor ?? '';
      const c = ta.localeCompare(tb);
      if (c !== 0) return c;
      return a.node_id.localeCompare(b.node_id);
    });
    return list;
  }
  list.sort((a, b) => a.node_id.localeCompare(b.node_id));
  return list;
}

/**
 * Group snapshots by global_hash; return hash that has the most nodes (quorum).
 */
function quorumHash(aggregated: AggregatedSnapshotSet): string | null {
  const countByHash = new Map<string, number>();
  for (const s of aggregated.snapshots) {
    const h = s.governance_state.global_hash;
    countByHash.set(h, (countByHash.get(h) ?? 0) + 1);
  }
  let bestHash: string | null = null;
  let bestCount = 0;
  for (const [h, c] of countByHash) {
    if (c > bestCount) {
      bestCount = c;
      bestHash = h;
    } else if (c === bestCount && h !== null) {
      if (bestHash === null || h.localeCompare(bestHash) < 0) bestHash = h;
    }
  }
  return bestHash;
}

/**
 * Apply consensus rules and choose one snapshot deterministically.
 */
export function applyConsensusRules(
  aggregated: AggregatedSnapshotSet,
  _conflictSet: SnapshotConflictSet,
  params: ConsensusParameters,
  nodeMetadata: readonly NodeMetadata[]
): SnapshotData {
  const metaMap = metadataByNode(nodeMetadata);
  const ordered = orderByPriority(aggregated, params, metaMap);
  if (ordered.length === 0) throw new Error('aggregated.snapshots is empty');
  if (params.conflict_resolution_policy === 'quorum') {
    const qHash = quorumHash(aggregated);
    if (qHash) {
      const chosen = ordered.find((s) => s.governance_state.global_hash === qHash);
      if (chosen) return chosen;
    }
  }
  if (params.conflict_resolution_policy === 'newest') {
    const byTime = [...ordered].sort((a, b) => b.timestamp - a.timestamp || a.node_id.localeCompare(b.node_id));
    return byTime[0];
  }
  if (params.conflict_resolution_policy === 'oldest') {
    const byTime = [...ordered].sort((a, b) => a.timestamp - b.timestamp || a.node_id.localeCompare(b.node_id));
    return byTime[0];
  }
  return ordered[0];
}

/**
 * Resolve conflicts and return the chosen snapshot plus resolution log.
 */
export function resolveConflicts(
  aggregated: AggregatedSnapshotSet,
  conflictSet: SnapshotConflictSet,
  params: ConsensusParameters,
  nodeMetadata: readonly NodeMetadata[],
  auditCollector?: (entry: import('../logging/consensus_audit_log.js').ConsensusAuditEntry) => void
): ResolutionOutcome {
  const chosen = applyConsensusRules(aggregated, conflictSet, params, nodeMetadata);
  const resolutionLog = generateResolutionLog(
    conflictSet,
    chosen.node_id,
    params.conflict_resolution_policy
  );
  if (auditCollector) {
    auditCollector(createConsensusAuditEntry('conflict_resolution', { chosen_node_id: chosen.node_id, policy: params.conflict_resolution_policy, entries_count: resolutionLog.entries.length }));
  }
  return { chosenSnapshot: chosen, resolutionLog };
}

/**
 * Generate a deterministic resolution log for audit.
 */
export function generateResolutionLog(
  conflictSet: SnapshotConflictSet,
  chosenNodeId: string,
  policyApplied: string
): ConflictResolutionLog {
  const timestamp = Date.now();
  const entries = conflictSet.conflicts.map((c, i) => ({
    conflict_id: hashConsensusPayload({ index: i, field: c.field, values: c.values }),
    policy_applied: policyApplied,
    chosen_node_id: chosenNodeId,
    reason: 'deterministic_consensus',
    timestamp,
  }));
  return Object.freeze({
    entries,
    version: CONSENSUS_ENGINE_SCHEMA_VERSION,
  });
}
