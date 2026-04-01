/**
 * Microstep 10F — Governance Trust Snapshot & Audit Engine. Snapshot audit.
 */

import type {
  GovernanceTrustSnapshot,
  SnapshotInput,
  SnapshotAuditResult,
} from '../types/trust_snapshot_types.js';
import {
  hashTrustGraph,
  hashPolicies,
  hashDecisions,
  computeGlobalSnapshotHash,
} from '../hashing/snapshot_hash_engine.js';

/**
 * Audit a snapshot by recomputing hashes from input and comparing with the snapshot.
 */
export function auditTrustSnapshot(
  snapshot: GovernanceTrustSnapshot,
  input: SnapshotInput
): SnapshotAuditResult {
  const trust_graph_hash = hashTrustGraph(input.trust_graph);
  const policy_hash = hashPolicies(input.policies);
  const decision_hash = hashDecisions(input.decisions);
  const recomputed_hash = computeGlobalSnapshotHash(
    trust_graph_hash,
    policy_hash,
    decision_hash,
    snapshot.timestamp
  );
  const valid = recomputed_hash === snapshot.global_hash;
  return Object.freeze({
    snapshot_id: snapshot.snapshot_id,
    valid,
    recomputed_hash,
  });
}
