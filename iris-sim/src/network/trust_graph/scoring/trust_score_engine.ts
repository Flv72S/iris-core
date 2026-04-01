/**
 * Microstep 10D — Governance Trust Graph Engine. Trust score engine.
 */

import type { GovernanceTrustGraph, TrustScore } from '../types/trust_graph_types.js';

/**
 * Compute trust scores: score = number of incoming edges.
 * Return sorted by score DESC, then by node_id ASC.
 */
export function computeTrustScores(graph: GovernanceTrustGraph): TrustScore[] {
  const incoming = new Map<string, number>();
  for (const nodeId of graph.nodes.keys()) {
    incoming.set(nodeId, 0);
  }
  for (const edge of graph.edges) {
    const count = incoming.get(edge.target_node) ?? 0;
    incoming.set(edge.target_node, count + 1);
  }
  const scores: TrustScore[] = Array.from(incoming.entries()).map(([node_id, score]) => ({
    node_id,
    score,
  }));
  scores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.node_id < b.node_id ? -1 : a.node_id > b.node_id ? 1 : 0;
  });
  return scores;
}
