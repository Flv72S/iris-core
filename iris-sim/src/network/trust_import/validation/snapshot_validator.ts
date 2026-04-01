/**
 * Microstep 10J — Governance Trust Import & Validation Engine. Snapshot consistency validator.
 */

import type { GovernanceTrustSnapshot } from '../../trust_snapshot/types/trust_snapshot_types.js';

/**
 * Validate snapshot structure and consistency (required fields, valid types, timestamp finite).
 */
export function validateSnapshotConsistency(snapshot: GovernanceTrustSnapshot): boolean {
  if (typeof snapshot.snapshot_id !== 'string' || snapshot.snapshot_id.length === 0) return false;
  if (typeof snapshot.timestamp !== 'number' || !Number.isFinite(snapshot.timestamp)) return false;
  if (typeof snapshot.trust_graph_hash !== 'string') return false;
  if (typeof snapshot.policy_hash !== 'string') return false;
  if (typeof snapshot.decision_hash !== 'string') return false;
  if (typeof snapshot.global_hash !== 'string' || snapshot.global_hash.length === 0) return false;
  return true;
}
