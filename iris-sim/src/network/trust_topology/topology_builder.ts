/**
 * Phase 13XX-I — Trust Topology Awareness. Builds graph from trust data (read-only).
 * Data can be derived from TrustEngine, NodePassport, TrustLedger via a TopologyDataSource.
 */

import type { TopologyNode } from './topology_node.js';
import type { TopologyEdge } from './topology_edge.js';
import { TrustGraph } from './trust_graph.js';

export interface TopologyDataSource {
  getNodes(): ReadonlyArray<TopologyNode> | Map<string, TopologyNode>;
  getEdges(): ReadonlyArray<TopologyEdge>;
}

export class TopologyBuilder {
  constructor(private readonly dataSource: TopologyDataSource) {}

  /** Build a read-only TrustGraph. Does not modify trust scores, passports, or ledger. */
  buildGraph(): TrustGraph {
    const rawNodes = this.dataSource.getNodes();
    const edges = [...this.dataSource.getEdges()];
    const nodes =
      rawNodes instanceof Map
        ? new Map(rawNodes)
        : new Map(rawNodes.map((n) => [n.node_id, { ...n }]));
    return new TrustGraph(nodes, edges);
  }
}
