/**
 * Phase 13M — Scalable Trust Graph Engine. Indexing structures.
 */

import type { GraphNode, TrustEdge } from './scalable_graph_types.js';

/** Node index: node_id → node reference. */
export type NodeIndex = Map<string, GraphNode>;

/** Edge index: source_node → adjacency list (outbound edges). */
export type EdgeIndex = Map<string, TrustEdge[]>;

/** Reverse index: target_node → inbound edges. */
export type ReverseEdgeIndex = Map<string, TrustEdge[]>;

/**
 * Build reverse index from edge index. Deterministic: inbound edges sorted by weight DESC then source.
 */
export function buildReverseIndex(edgeIndex: EdgeIndex): ReverseEdgeIndex {
  const reverse = new Map<string, TrustEdge[]>();
  for (const edges of edgeIndex.values()) {
    for (const e of edges) {
      const list = reverse.get(e.target) ?? [];
      list.push(e);
      reverse.set(e.target, list);
    }
  }
  for (const [target, list] of reverse) {
    const sorted = [...list].sort((a, b) => {
      const w = b.weight - a.weight;
      return w !== 0 ? w : a.source.localeCompare(b.source);
    });
    reverse.set(target, sorted);
  }
  return reverse;
}
