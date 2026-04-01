/**
 * Phase 13M — Scalable Trust Graph Engine. Efficient graph queries.
 * 13N: Optional integration with TrustPropagationEngine for cached propagation.
 */

import type { ScalableTrustGraph, TrustEdge } from './scalable_graph_types.js';
import { buildReverseIndex } from './graph_storage_index.js';
import type { TrustGraphPolicy } from '../trust_policy/index.js';
import { DEFAULT_TRUST_POLICY } from '../trust_policy/index.js';
import type { TrustPropagationEngine } from './trust_propagation_engine.js';

/**
 * Get outbound edges for a node. O(1). Deterministic order (weight DESC, target ASC).
 */
export function getNeighbors(
  graph: ScalableTrustGraph,
  node_id: string
): TrustEdge[] {
  return graph.edges.get(node_id) ?? [];
}

/**
 * Get inbound edges for a node. Uses reverse index; deterministic order.
 */
export function getInboundNeighbors(
  graph: ScalableTrustGraph,
  node_id: string
): TrustEdge[] {
  const reverse = buildReverseIndex(graph.edges);
  return reverse.get(node_id) ?? [];
}

/**
 * Bounded BFS trust propagation: from source, traverse up to `depth` hops,
 * accumulating trust × decay_factor per hop. Policy supplies decay and depth limit.
 */
export function computeTrustPropagation(
  graph: ScalableTrustGraph,
  source: string,
  depth: number,
  policy?: TrustGraphPolicy
): Map<string, number> {
  const graphPolicy = policy ?? DEFAULT_TRUST_POLICY.trust_graph;
  const decay = graphPolicy.trust_decay_factor;
  const maxDepth = Math.min(depth, graphPolicy.trust_propagation_depth);

  const result = new Map<string, number>();
  result.set(source, 1);

  let frontier = new Map<string, number>([[source, 1]]);
  for (let d = 0; d < maxDepth && frontier.size > 0; d++) {
    const next = new Map<string, number>();
    for (const [node, trust] of frontier) {
      const edges = graph.edges.get(node) ?? [];
      for (const e of edges) {
        const propagated = trust * e.weight * decay;
        const cur = next.get(e.target) ?? 0;
        if (propagated > cur) next.set(e.target, propagated);
        const existing = result.get(e.target) ?? 0;
        if (propagated > existing) result.set(e.target, propagated);
      }
    }
    frontier = next;
  }
  return result;
}

/**
 * Run optimized (cached) propagation using TrustPropagationEngine. Use when the same source
 * is queried repeatedly; cache is invalidated when graph version changes.
 */
export function computeTrustPropagationFromEngine(
  engine: TrustPropagationEngine,
  source: string
): Map<string, number> {
  const result = engine.propagateTrust(source);
  return new Map(result.propagated_scores);
}
