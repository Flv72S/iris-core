/**
 * Phase 11A — Snapshot aggregation: load, normalize, verify, aggregate.
 */

import { computeGlobalSnapshotHash } from '../../../governance/global_snapshot/hashing/global_snapshot_hash.js';
import type { GlobalGovernanceSnapshot } from '../../../governance/global_snapshot/types/global_snapshot_types.js';
import { createConsensusAuditEntry } from '../logging/consensus_audit_log.js';
import type { ConsensusAuditEntry } from '../logging/consensus_audit_log.js';
import type { SnapshotData, AggregatedSnapshotSet } from '../types/consensus_engine_types.js';
import { CONSENSUS_ENGINE_SCHEMA_VERSION } from '../types/consensus_engine_types.js';

/**
 * Verify snapshot integrity: recomputed global_hash matches stored.
 */
export function verifySnapshotIntegrity(snapshot: GlobalGovernanceSnapshot): boolean {
  const recomputed = computeGlobalSnapshotHash(snapshot);
  return recomputed === snapshot.global_hash;
}

/**
 * Normalize a single SnapshotData: ensure snapshot_hash equals governance_state.global_hash.
 * Returns normalized SnapshotData (same or with snapshot_hash corrected).
 */
export function normalizeSnapshot(data: SnapshotData): SnapshotData {
  const expectedHash = data.governance_state.global_hash;
  if (data.snapshot_hash === expectedHash) return data;
  return Object.freeze({
    ...data,
    snapshot_hash: expectedHash,
  });
}

/**
 * Normalize all snapshots in the array.
 */
export function normalizeSnapshots(snapshots: readonly SnapshotData[]): SnapshotData[] {
  return snapshots.map(normalizeSnapshot);
}

/**
 * Load and validate: filter to only entries that pass integrity check.
 * Returns { valid: SnapshotData[], invalidCount: number }.
 */
export function loadSnapshots(
  snapshots: readonly SnapshotData[]
): { valid: SnapshotData[]; invalid: SnapshotData[] } {
  const valid: SnapshotData[] = [];
  const invalid: SnapshotData[] = [];
  for (const s of snapshots) {
    const hashMatches = s.snapshot_hash === s.governance_state.global_hash;
    if (hashMatches && verifySnapshotIntegrity(s.governance_state)) valid.push(s);
    else invalid.push(s);
  }
  return { valid, invalid };
}

/**
 * Aggregate snapshots: load, normalize, verify, and build AggregatedSnapshotSet.
 * Produces audit entry for snapshot_ingestion.
 */
export function aggregateSnapshots(
  snapshots: readonly SnapshotData[],
  auditCollector?: (entry: ConsensusAuditEntry) => void
): AggregatedSnapshotSet {
  const { valid: rawValid, invalid } = loadSnapshots(snapshots);
  const valid = normalizeSnapshots(rawValid);
  const node_ids = [...new Set(valid.map((s) => s.node_id))];
  const set: AggregatedSnapshotSet = Object.freeze({
    snapshots: valid,
    node_ids,
    valid_count: valid.length,
    invalid_count: invalid.length,
    version: CONSENSUS_ENGINE_SCHEMA_VERSION,
  });
  if (auditCollector) {
    auditCollector(createConsensusAuditEntry('snapshot_ingestion', { snapshot_count: snapshots.length, valid_count: valid.length, invalid_count: invalid.length, node_ids }));
  }
  return set;
}
