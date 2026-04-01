/**
 * Test helpers for Trust State Replay tests.
 */

import type { GovernanceTrustGraph, TrustNode } from '../../trust_graph/types/trust_graph_types.js';

export function makeGraph(
  nodes: TrustNode[],
  edges: { source: string; target: string; cert_id: string }[]
): GovernanceTrustGraph {
  const nodeMap = new Map<string, TrustNode>();
  for (const n of nodes) nodeMap.set(n.node_id, n);
  const edgeList = edges.map((e) => ({
    source_node: e.source,
    target_node: e.target,
    certificate_id: e.cert_id,
    reason: 'verified',
  }));
  return Object.freeze({
    nodes: new Map(nodeMap),
    edges: edgeList,
  });
}
