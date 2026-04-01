/**
 * Phase 11A — Conflict detection: identify divergences between snapshots.
 */

import { createConsensusAuditEntry } from '../logging/consensus_audit_log.js';
import type { ConsensusAuditEntry } from '../logging/consensus_audit_log.js';
import type {
  AggregatedSnapshotSet,
  SnapshotConflictSet,
  SnapshotConflictEntry,
  ConsensusParameters,
} from '../types/consensus_engine_types.js';
import { CONSENSUS_ENGINE_SCHEMA_VERSION } from '../types/consensus_engine_types.js';

/**
 * Detect divergences: different global_hash, timestamps out of tolerance, missing nodes.
 */
export function detectSnapshotDivergence(
  aggregated: AggregatedSnapshotSet,
  params: ConsensusParameters,
  expectedNodeIds?: readonly string[],
  auditCollector?: (entry: ConsensusAuditEntry) => void
): SnapshotConflictSet {
  const conflicts: SnapshotConflictEntry[] = [];
  const byHash = new Map<string, { node_id: string; timestamp: number }[]>();
  for (const s of aggregated.snapshots) {
    const h = s.governance_state.global_hash;
    if (!byHash.has(h)) byHash.set(h, []);
    byHash.get(h)!.push({ node_id: s.node_id, timestamp: s.timestamp });
  }
  const hashes = [...byHash.keys()].sort();
  if (hashes.length > 1) {
    for (let i = 0; i < hashes.length; i++) {
      for (let j = i + 1; j < hashes.length; j++) {
        conflicts.push({
          field: 'global_hash',
          values: [
            ...byHash.get(hashes[i])!.map((x) => ({ node_id: x.node_id, value: hashes[i] })),
            ...byHash.get(hashes[j])!.map((x) => ({ node_id: x.node_id, value: hashes[j] })),
          ],
          resolution: 'unresolved',
        });
      }
    }
  }
  const now = Math.max(...aggregated.snapshots.map((s) => s.timestamp), 0) || Date.now();
  const out_of_tolerance_nodes: string[] = [];
  for (const s of aggregated.snapshots) {
    if (Math.abs(now - s.timestamp) > params.timestamp_tolerance) out_of_tolerance_nodes.push(s.node_id);
  }
  const presentNodeIds = new Set(aggregated.node_ids);
  const missing_nodes: string[] = expectedNodeIds ? expectedNodeIds.filter((id) => !presentNodeIds.has(id)) : [];
  const conflictSet: SnapshotConflictSet = Object.freeze({
    conflicts,
    missing_nodes,
    out_of_tolerance_nodes,
    version: CONSENSUS_ENGINE_SCHEMA_VERSION,
  });
  if (auditCollector) {
    auditCollector(createConsensusAuditEntry('conflict_detection', { conflict_count: conflicts.length, missing_count: missing_nodes.length, out_of_tolerance_count: out_of_tolerance_nodes.length }));
  }
  return conflictSet;
}

/**
 * Build conflict set (alias for detectSnapshotDivergence for API consistency).
 */
export function buildConflictSet(
  aggregated: AggregatedSnapshotSet,
  params: ConsensusParameters,
  expectedNodeIds?: readonly string[],
  auditCollector?: (entry: ConsensusAuditEntry) => void
): SnapshotConflictSet {
  return detectSnapshotDivergence(aggregated, params, expectedNodeIds, auditCollector);
}
