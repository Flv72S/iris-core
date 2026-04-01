/**
 * Microstep 10F — Governance Trust Snapshot & Audit Engine. Snapshot builder.
 */

import type { SnapshotInput, GovernanceTrustSnapshot } from '../types/trust_snapshot_types.js';
import {
  hashTrustGraph,
  hashPolicies,
  hashDecisions,
  computeGlobalSnapshotHash,
} from '../hashing/snapshot_hash_engine.js';

/**
 * Build a deterministic trust snapshot from graph, scores, policies, and decisions.
 */
export function buildTrustSnapshot(input: SnapshotInput): GovernanceTrustSnapshot {
  const timestamp = input.timestamp ?? Date.now();

  const trust_graph_hash = hashTrustGraph(input.trust_graph);
  const policy_hash = hashPolicies(input.policies);
  const decision_hash = hashDecisions(input.decisions);
  const global_hash = computeGlobalSnapshotHash(
    trust_graph_hash,
    policy_hash,
    decision_hash,
    timestamp
  );

  const snapshot_id = global_hash;

  return Object.freeze({
    snapshot_id,
    timestamp,
    trust_graph_hash,
    policy_hash,
    decision_hash,
    global_hash,
  });
}
