/**
 * Phase 13B — Trust Graph Engine. Trust propagation (A->B, B->C => A->C).
 */

import type { TrustGraph, TrustEdge } from './trust_graph_types.js';

const PROPAGATION_THRESHOLD = 0.1;
const MAX_EDGES_PER_NODE = 50;

/**
 * Propagate trust: if A->B and B->C, add A->C with weight = w(A,B)*w(B,C)*factor.
 * Add only if propagated weight >= 0.1. Cap 50 outgoing edges per node.
 */
export function propagateTrust(graph: TrustGraph, propagation_factor: number): TrustGraph {
  const existing = new Map<string, number>();
  for (const e of graph.edges) {
    const key = `${e.from_node}\t${e.to_node}`;
    const cur = existing.get(key);
    if (cur === undefined || e.trust_weight > cur) existing.set(key, e.trust_weight);
  }

  for (const e1 of graph.edges) {
    for (const e2 of graph.edges) {
      if (e1.to_node !== e2.from_node) continue;
      const from = e1.from_node;
      const to = e2.to_node;
      if (from === to) continue;
      const propagated = e1.trust_weight * e2.trust_weight * propagation_factor;
      if (propagated < PROPAGATION_THRESHOLD) continue;
      const key = `${from}\t${to}`;
      const cur = existing.get(key);
      if (cur === undefined || propagated > cur) existing.set(key, propagated);
    }
  }

  const edges: TrustEdge[] = [];
  for (const [key, weight] of existing) {
    const [from_node, to_node] = key.split('\t');
    edges.push(Object.freeze({ from_node, to_node, trust_weight: weight }));
  }

  const byFrom = new Map<string, TrustEdge[]>();
  for (const e of edges) {
    const list = byFrom.get(e.from_node) ?? [];
    list.push(e);
    byFrom.set(e.from_node, list);
  }

  const finalEdges: TrustEdge[] = [];
  for (const list of byFrom.values()) {
    const sorted = [...list].sort((a, b) => b.trust_weight - a.trust_weight || a.to_node.localeCompare(b.to_node));
    for (const e of sorted.slice(0, MAX_EDGES_PER_NODE)) {
      finalEdges.push(e);
    }
  }

  return { nodes: graph.nodes, edges: finalEdges };
}
