/**
 * Microstep 10J — Governance Trust Import & Validation Engine. Trust graph validator.
 */

import type { GovernanceTrustGraph } from '../../trust_graph/types/trust_graph_types.js';

/**
 * Validate trust graph: structure, node ids, edge endpoints exist.
 */
export function validateTrustGraph(graph: GovernanceTrustGraph): boolean {
  if (!graph || typeof graph !== 'object') return false;
  if (!(graph.nodes instanceof Map) && typeof graph.nodes !== 'object') return false;
  if (!Array.isArray(graph.edges)) return false;
  const nodeIds = new Set<string>();
  const nodes = graph.nodes instanceof Map ? graph.nodes : new Map(Object.entries(graph.nodes as unknown as Record<string, { node_id: string; public_key: string }>));
  for (const [id, n] of nodes.entries()) {
    if (!n || typeof (n as { node_id?: string }).node_id !== 'string' || typeof (n as { public_key?: string }).public_key !== 'string') return false;
    if ((n as { node_id: string }).node_id !== id) return false;
    nodeIds.add(id);
  }
  for (const e of graph.edges) {
    if (typeof e.source_node !== 'string' || typeof e.target_node !== 'string' ||
        typeof e.certificate_id !== 'string' || typeof e.reason !== 'string') return false;
    if (!nodeIds.has(e.source_node) || !nodeIds.has(e.target_node)) return false;
  }
  return true;
}
