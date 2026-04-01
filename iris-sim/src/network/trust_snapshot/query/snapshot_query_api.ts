/**
 * Microstep 10F — Governance Trust Snapshot & Audit Engine. Snapshot query API.
 */

import type { GovernanceTrustSnapshot, SnapshotInput } from '../types/trust_snapshot_types.js';
import { auditTrustSnapshot } from '../audit/snapshot_audit_engine.js';

/**
 * Return the global hash of the snapshot.
 */
export function getSnapshotHash(snapshot: GovernanceTrustSnapshot): string {
  return snapshot.global_hash;
}

/**
 * Verify snapshot against the given input (recompute and compare).
 */
export function verifySnapshot(
  snapshot: GovernanceTrustSnapshot,
  input: SnapshotInput
): boolean {
  const result = auditTrustSnapshot(snapshot, input);
  return result.valid;
}
