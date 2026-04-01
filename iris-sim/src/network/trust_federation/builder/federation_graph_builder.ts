/**
 * Microstep 10K — Governance Trust Federation Engine. Federation graph builder.
 */

import type { GovernanceTrustGraph } from '../../trust_graph/types/trust_graph_types.js';
import type { GovernanceTrustExportPackage } from '../../trust_export/types/trust_export_types.js';
import type { FederatedNode, FederatedTrustEdge, FederatedTrustGraph } from '../types/federation_types.js';

/**
 * Build federated trust graph from local graph and validated imported packages.
 * Nodes are unique by node_id; edges are unique by (source_node, target_node) with aggregated weight.
 */
export function buildFederatedTrustGraph(
  local_graph: GovernanceTrustGraph,
  imported_packages: readonly GovernanceTrustExportPackage[]
): FederatedTrustGraph {
  const nodeIds = new Set<string>();
  const edgeKeyToWeight = new Map<string, number>();

  function addGraph(g: GovernanceTrustGraph): void {
    for (const [id] of g.nodes) nodeIds.add(id);
    for (const e of g.edges) {
      const key = `${e.source_node}\0${e.target_node}`;
      edgeKeyToWeight.set(key, (edgeKeyToWeight.get(key) ?? 0) + 1);
    }
  }

  addGraph(local_graph);
  for (const pkg of imported_packages) {
    addGraph(pkg.trust_graph);
  }

  const nodes: FederatedNode[] = Array.from(nodeIds)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((node_id) => ({ node_id, trust_score: 0 }));

  const edges: FederatedTrustEdge[] = Array.from(edgeKeyToWeight.entries())
    .map(([key, weight]) => {
      const [source_node, target_node] = key.split('\0');
      return { source_node, target_node, weight };
    })
    .sort((a, b) => {
      if (a.source_node !== b.source_node) return a.source_node < b.source_node ? -1 : 1;
      return a.target_node < b.target_node ? -1 : a.target_node > b.target_node ? 1 : 0;
    });

  return Object.freeze({ nodes, edges });
}
