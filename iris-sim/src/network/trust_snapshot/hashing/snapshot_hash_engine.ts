/**
 * Microstep 10F — Governance Trust Snapshot & Audit Engine. Snapshot hashing.
 */

import { createHash } from 'node:crypto';
import type { GovernanceTrustGraph } from '../../trust_graph/types/trust_graph_types.js';
import type { TrustPolicy, TrustDecision } from '../../trust_policy/types/trust_policy_types.js';
import { serializeDeterministic, normalizeArray } from '../utils/snapshot_utils.js';

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Hash trust graph deterministically (nodes sorted by node_id, edges by source_node, target_node, certificate_id).
 */
export function hashTrustGraph(graph: GovernanceTrustGraph): string {
  const nodeIds = Array.from(graph.nodes.keys()).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const nodesPayload = nodeIds.map((id) => {
    const n = graph.nodes.get(id)!;
    return serializeDeterministic({ node_id: n.node_id, public_key: n.public_key });
  });
  const edgesSorted = [...graph.edges].sort((a, b) => {
    if (a.source_node !== b.source_node) return a.source_node < b.source_node ? -1 : 1;
    if (a.target_node !== b.target_node) return a.target_node < b.target_node ? -1 : 1;
    return a.certificate_id < b.certificate_id ? -1 : a.certificate_id > b.certificate_id ? 1 : 0;
  });
  const edgesPayload = edgesSorted.map((e) =>
    serializeDeterministic({
      source_node: e.source_node,
      target_node: e.target_node,
      certificate_id: e.certificate_id,
      reason: e.reason,
    })
  );
  const payload = 'graph:nodes=' + nodesPayload.join('|') + ';edges=' + edgesPayload.join('|');
  return sha256(payload);
}

/**
 * Hash policies deterministically (sorted by policy_id).
 */
export function hashPolicies(policies: readonly TrustPolicy[]): string {
  const arr = normalizeArray([...policies].map((p) => ({ ...p })));
  const payload = 'policies:' + arr.map((p) => serializeDeterministic(p)).join('|');
  return sha256(payload);
}

/**
 * Hash decisions deterministically (sorted by node_id, then policy_id).
 */
export function hashDecisions(decisions: readonly TrustDecision[]): string {
  const arr = [...decisions].sort((a, b) => {
    if (a.node_id !== b.node_id) return a.node_id < b.node_id ? -1 : 1;
    return a.policy_id < b.policy_id ? -1 : a.policy_id > b.policy_id ? 1 : 0;
  });
  const payload = 'decisions:' + arr.map((d) => serializeDeterministic(d)).join('|');
  return sha256(payload);
}

/**
 * Compute global snapshot hash from partial hashes and timestamp.
 */
export function computeGlobalSnapshotHash(
  trust_graph_hash: string,
  policy_hash: string,
  decision_hash: string,
  timestamp: number
): string {
  const payload = `global:graph=${trust_graph_hash}|policy=${policy_hash}|decision=${decision_hash}|ts=${timestamp}`;
  return sha256(payload);
}
