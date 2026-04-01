/**
 * Microstep 10D — Governance Trust Graph Engine. Trust graph query.
 */

import type { GovernanceTrustGraph, TrustNode, TrustEdge } from '../types/trust_graph_types.js';

/**
 * Return all trusted nodes (graph nodes) sorted by node_id.
 */
export function getTrustedNodes(graph: GovernanceTrustGraph): TrustNode[] {
  const list = Array.from(graph.nodes.values());
  list.sort((a, b) => (a.node_id < b.node_id ? -1 : a.node_id > b.node_id ? 1 : 0));
  return list;
}

/**
 * Return all trust relationships where the node is source or target, sorted by certificate_id.
 */
export function getTrustRelationships(
  graph: GovernanceTrustGraph,
  node_id: string
): TrustEdge[] {
  const list = graph.edges.filter(
    (e) => e.source_node === node_id || e.target_node === node_id
  );
  list.sort((a, b) =>
    a.certificate_id < b.certificate_id ? -1 : a.certificate_id > b.certificate_id ? 1 : 0
  );
  return list;
}
