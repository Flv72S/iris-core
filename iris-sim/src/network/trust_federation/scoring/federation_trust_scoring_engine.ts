/**
 * Microstep 10K — Governance Trust Federation Engine. Federation trust scoring.
 */

import type { FederatedTrustGraph, FederatedNode } from '../types/federation_types.js';

/**
 * Compute federated trust scores: score = sum of incoming edge weights.
 * Returns graph with nodes updated with trust_score, deterministic order.
 */
export function computeFederatedTrustScores(
  graph: FederatedTrustGraph
): FederatedTrustGraph {
  const incoming = new Map<string, number>();
  for (const n of graph.nodes) {
    incoming.set(n.node_id, 0);
  }
  for (const e of graph.edges) {
    incoming.set(e.target_node, (incoming.get(e.target_node) ?? 0) + e.weight);
  }
  const nodes: FederatedNode[] = graph.nodes
    .map((n) => ({ node_id: n.node_id, trust_score: incoming.get(n.node_id) ?? 0 }))
    .sort((a, b) => (a.node_id < b.node_id ? -1 : a.node_id > b.node_id ? 1 : 0));
  return Object.freeze({ nodes, edges: graph.edges });
}
