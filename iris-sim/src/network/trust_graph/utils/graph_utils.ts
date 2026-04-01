/**
 * Microstep 10D — Governance Trust Graph Engine. Graph utilities.
 */

import type { TrustEdge } from '../types/trust_graph_types.js';

/**
 * Check if an edge already exists in the list (same source, target, certificate_id).
 */
export function edgeExists(edges: readonly TrustEdge[], edge: TrustEdge): boolean {
  return edges.some(
    (e) =>
      e.source_node === edge.source_node &&
      e.target_node === edge.target_node &&
      e.certificate_id === edge.certificate_id
  );
}

/**
 * Sort edges deterministically: source_node, then target_node, then certificate_id.
 */
export function sortEdgesDeterministically(edges: readonly TrustEdge[]): TrustEdge[] {
  return [...edges].sort((a, b) => {
    if (a.source_node !== b.source_node) {
      return a.source_node < b.source_node ? -1 : 1;
    }
    if (a.target_node !== b.target_node) {
      return a.target_node < b.target_node ? -1 : 1;
    }
    return a.certificate_id < b.certificate_id ? -1 : a.certificate_id > b.certificate_id ? 1 : 0;
  });
}
