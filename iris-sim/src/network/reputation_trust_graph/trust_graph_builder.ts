/**
 * Phase 13B — Trust Graph Engine. Build graph from reputation profiles.
 * Uses Phase 13M scalable trust graph internally; converts to TrustGraph for backward compatibility.
 */

import type { NodeReputationProfile } from '../reputation_engine/index.js';
import type { TrustGraph, TrustNode, TrustEdge } from './trust_graph_types.js';
import { buildScalableTrustGraph } from '../trust_graph_scalable/index.js';

/**
 * Build trust graph from reputation profiles. Delegates to scalable engine (13M);
 * only edges with weight >= 0.2, at most policy max_edges_per_node per node (highest weights kept).
 */
export function buildTrustGraph(reputations: readonly NodeReputationProfile[]): TrustGraph {
  const scalable = buildScalableTrustGraph(reputations);

  const nodes = new Map<string, TrustNode>();
  for (const r of reputations) {
    nodes.set(r.node_id, Object.freeze({ node_id: r.node_id, reputation_score: r.reputation_score }));
  }

  const edges: TrustEdge[] = [];
  const sourceIds = [...scalable.edges.keys()].sort((a, b) => a.localeCompare(b));
  for (const from_id of sourceIds) {
    const outList = scalable.edges.get(from_id) ?? [];
    for (const e of outList) {
      edges.push(
        Object.freeze({
          from_node: e.source,
          to_node: e.target,
          trust_weight: e.weight,
        })
      );
    }
  }

  return { nodes, edges };
}
