/**
 * Phase 13B — Trust Graph Engine. Trust weight decay.
 */

import type { TrustGraph, TrustEdge } from './trust_graph_types.js';

/**
 * Apply decay to every edge: new_weight = weight * decay_factor.
 */
export function applyTrustDecay(graph: TrustGraph, decay_factor: number): TrustGraph {
  const edges: TrustEdge[] = graph.edges.map((e) =>
    Object.freeze({
      from_node: e.from_node,
      to_node: e.to_node,
      trust_weight: Math.min(1, Math.max(0, e.trust_weight * decay_factor)),
    })
  );
  return { nodes: graph.nodes, edges };
}
