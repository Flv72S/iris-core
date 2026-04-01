/**
 * Phase 13XX-I — Trust Topology Awareness. Central service (read-only).
 */

import type { TrustGraph } from './trust_graph.js';
import type { TopologyBuilder } from './topology_builder.js';
import type { TopologyAnalyzer } from './topology_analyzer.js';

export interface TopologyAnalysisResult {
  readonly clusters: readonly (readonly string[])[];
  readonly bridge_nodes: readonly string[];
  readonly trust_concentration: readonly string[];
}

export class TopologyService {
  constructor(
    private readonly builder: TopologyBuilder,
    private readonly analyzer: TopologyAnalyzer
  ) {}

  getTrustGraph(): TrustGraph {
    return this.builder.buildGraph();
  }

  analyzeTopology(): TopologyAnalysisResult {
    const graph = this.builder.buildGraph();
    return {
      clusters: this.analyzer.detectClusters(graph),
      bridge_nodes: this.analyzer.findBridgeNodes(graph),
      trust_concentration: this.analyzer.detectTrustConcentration(graph),
    };
  }
}
