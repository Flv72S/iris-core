/**
 * Phase 13XX-I — Trust Topology Awareness. Trust graph (read-only).
 */

import type { TopologyNode } from './topology_node.js';
import type { TopologyEdge } from './topology_edge.js';

export class TrustGraph {
  readonly nodes: Map<string, TopologyNode>;
  readonly edges: TopologyEdge[];

  constructor(nodes?: Map<string, TopologyNode>, edges?: TopologyEdge[]) {
    this.nodes = nodes ?? new Map();
    this.edges = edges ?? [];
  }
}
