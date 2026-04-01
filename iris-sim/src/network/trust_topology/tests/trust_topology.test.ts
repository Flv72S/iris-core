/**
 * Phase 13XX-I — Trust Topology Awareness. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  TopologyBuilder,
  TopologyAnalyzer,
  TopologyService,
  type TopologyNode,
  type TopologyEdge,
  type TopologyDataSource,
} from '../index.js';

function dataSource(nodes: TopologyNode[], edges: TopologyEdge[]): TopologyDataSource {
  return {
    getNodes: () => nodes,
    getEdges: () => edges,
  };
}

describe('Trust Topology (Phase 13XX-I)', () => {
  describe('graph building', () => {
    it('builds graph from nodes and edges', () => {
      const nodes: TopologyNode[] = [
        { node_id: 'a', trust_score: 0.8, reputation_score: 0.7 },
        { node_id: 'b', trust_score: 0.6, reputation_score: 0.5 },
      ];
      const edges: TopologyEdge[] = [
        { source_node: 'a', target_node: 'b', trust_weight: 0.9 },
      ];
      const builder = new TopologyBuilder(dataSource(nodes, edges));
      const graph = builder.buildGraph();
      assert.strictEqual(graph.nodes.size, 2);
      assert.strictEqual(graph.edges.length, 1);
      assert.strictEqual(graph.nodes.get('a')?.trust_score, 0.8);
      assert.strictEqual(graph.edges[0].source_node, 'a');
      assert.strictEqual(graph.edges[0].target_node, 'b');
      assert.strictEqual(graph.edges[0].trust_weight, 0.9);
    });

    it('builds empty graph when no nodes or edges', () => {
      const builder = new TopologyBuilder(dataSource([], []));
      const graph = builder.buildGraph();
      assert.strictEqual(graph.nodes.size, 0);
      assert.strictEqual(graph.edges.length, 0);
    });

    it('accepts Map for getNodes', () => {
      const nodeMap = new Map<string, TopologyNode>([
        ['x', { node_id: 'x', trust_score: 0.5, reputation_score: 0.5 }],
      ]);
      const builder = new TopologyBuilder({
        getNodes: () => nodeMap,
        getEdges: () => [],
      });
      const graph = builder.buildGraph();
      assert.strictEqual(graph.nodes.size, 1);
      assert.strictEqual(graph.nodes.get('x')?.node_id, 'x');
    });
  });

  describe('cluster detection', () => {
    it('single connected graph yields one cluster', () => {
      const nodes: TopologyNode[] = [
        { node_id: 'a', trust_score: 0.8, reputation_score: 0.7 },
        { node_id: 'b', trust_score: 0.6, reputation_score: 0.5 },
        { node_id: 'c', trust_score: 0.7, reputation_score: 0.6 },
      ];
      const edges: TopologyEdge[] = [
        { source_node: 'a', target_node: 'b', trust_weight: 0.9 },
        { source_node: 'b', target_node: 'c', trust_weight: 0.8 },
      ];
      const builder = new TopologyBuilder(dataSource(nodes, edges));
      const analyzer = new TopologyAnalyzer();
      const graph = builder.buildGraph();
      const clusters = analyzer.detectClusters(graph);
      assert.strictEqual(clusters.length, 1);
      assert.strictEqual(clusters[0].length, 3);
      assert.ok(clusters[0].includes('a') && clusters[0].includes('b') && clusters[0].includes('c'));
    });

    it('disconnected components yield multiple clusters', () => {
      const nodes: TopologyNode[] = [
        { node_id: 'a', trust_score: 0.8, reputation_score: 0.7 },
        { node_id: 'b', trust_score: 0.6, reputation_score: 0.5 },
        { node_id: 'x', trust_score: 0.5, reputation_score: 0.5 },
        { node_id: 'y', trust_score: 0.5, reputation_score: 0.5 },
      ];
      const edges: TopologyEdge[] = [
        { source_node: 'a', target_node: 'b', trust_weight: 0.9 },
        { source_node: 'x', target_node: 'y', trust_weight: 0.7 },
      ];
      const builder = new TopologyBuilder(dataSource(nodes, edges));
      const analyzer = new TopologyAnalyzer();
      const graph = builder.buildGraph();
      const clusters = analyzer.detectClusters(graph);
      assert.strictEqual(clusters.length, 2);
      assert.strictEqual(clusters[0].length, 2);
      assert.strictEqual(clusters[1].length, 2);
      const flat = clusters.flat();
      assert.ok(flat.includes('a') && flat.includes('b') && flat.includes('x') && flat.includes('y'));
    });
  });

  describe('bridge node detection', () => {
    it('bridge node is detected in chain a-b-c (b is bridge)', () => {
      const nodes: TopologyNode[] = [
        { node_id: 'a', trust_score: 0.8, reputation_score: 0.7 },
        { node_id: 'b', trust_score: 0.6, reputation_score: 0.5 },
        { node_id: 'c', trust_score: 0.7, reputation_score: 0.6 },
      ];
      const edges: TopologyEdge[] = [
        { source_node: 'a', target_node: 'b', trust_weight: 0.9 },
        { source_node: 'b', target_node: 'c', trust_weight: 0.8 },
      ];
      const builder = new TopologyBuilder(dataSource(nodes, edges));
      const analyzer = new TopologyAnalyzer();
      const graph = builder.buildGraph();
      const bridges = analyzer.findBridgeNodes(graph);
      assert.ok(bridges.includes('b'));
      assert.strictEqual(bridges.length, 1);
    });

    it('no bridge in triangle a-b-c-a', () => {
      const nodes: TopologyNode[] = [
        { node_id: 'a', trust_score: 0.8, reputation_score: 0.7 },
        { node_id: 'b', trust_score: 0.6, reputation_score: 0.5 },
        { node_id: 'c', trust_score: 0.7, reputation_score: 0.6 },
      ];
      const edges: TopologyEdge[] = [
        { source_node: 'a', target_node: 'b', trust_weight: 0.9 },
        { source_node: 'b', target_node: 'c', trust_weight: 0.8 },
        { source_node: 'c', target_node: 'a', trust_weight: 0.7 },
      ];
      const builder = new TopologyBuilder(dataSource(nodes, edges));
      const analyzer = new TopologyAnalyzer();
      const graph = builder.buildGraph();
      const bridges = analyzer.findBridgeNodes(graph);
      assert.strictEqual(bridges.length, 0);
    });
  });

  describe('trust concentration', () => {
    it('nodes ordered by incoming trust weight (highest first)', () => {
      const nodes: TopologyNode[] = [
        { node_id: 'a', trust_score: 0.8, reputation_score: 0.7 },
        { node_id: 'b', trust_score: 0.6, reputation_score: 0.5 },
        { node_id: 'c', trust_score: 0.7, reputation_score: 0.6 },
      ];
      const edges: TopologyEdge[] = [
        { source_node: 'a', target_node: 'c', trust_weight: 0.9 },
        { source_node: 'b', target_node: 'c', trust_weight: 0.3 },
      ];
      const builder = new TopologyBuilder(dataSource(nodes, edges));
      const analyzer = new TopologyAnalyzer();
      const graph = builder.buildGraph();
      const concentration = analyzer.detectTrustConcentration(graph);
      assert.strictEqual(concentration[0], 'c');
      assert.strictEqual(concentration.length, 1);
    });

    it('multiple targets ordered by total incoming weight', () => {
      const nodes: TopologyNode[] = [
        { node_id: 'a', trust_score: 0.5, reputation_score: 0.5 },
        { node_id: 'b', trust_score: 0.5, reputation_score: 0.5 },
        { node_id: 'c', trust_score: 0.5, reputation_score: 0.5 },
      ];
      const edges: TopologyEdge[] = [
        { source_node: 'a', target_node: 'b', trust_weight: 0.5 },
        { source_node: 'a', target_node: 'c', trust_weight: 0.9 },
      ];
      const builder = new TopologyBuilder(dataSource(nodes, edges));
      const analyzer = new TopologyAnalyzer();
      const graph = builder.buildGraph();
      const concentration = analyzer.detectTrustConcentration(graph);
      assert.strictEqual(concentration[0], 'c');
      assert.strictEqual(concentration[1], 'b');
    });
  });

  describe('deterministic topology', () => {
    it('same data source produces same graph and analysis', () => {
      const nodes: TopologyNode[] = [
        { node_id: 'a', trust_score: 0.8, reputation_score: 0.7 },
        { node_id: 'b', trust_score: 0.6, reputation_score: 0.5 },
      ];
      const edges: TopologyEdge[] = [
        { source_node: 'a', target_node: 'b', trust_weight: 0.9 },
      ];
      const ds = dataSource(nodes, edges);
      const builder = new TopologyBuilder(ds);
      const analyzer = new TopologyAnalyzer();
      const g1 = builder.buildGraph();
      const g2 = builder.buildGraph();
      assert.strictEqual(g1.nodes.size, g2.nodes.size);
      assert.strictEqual(g1.edges.length, g2.edges.length);
      const c1 = analyzer.detectClusters(g1);
      const c2 = analyzer.detectClusters(g2);
      assert.deepStrictEqual(c1, c2);
    });
  });

  describe('TopologyService', () => {
    it('getTrustGraph returns built graph', () => {
      const nodes: TopologyNode[] = [
        { node_id: 'n1', trust_score: 0.7, reputation_score: 0.6 },
      ];
      const builder = new TopologyBuilder(dataSource(nodes, []));
      const service = new TopologyService(builder, new TopologyAnalyzer());
      const graph = service.getTrustGraph();
      assert.strictEqual(graph.nodes.size, 1);
      assert.strictEqual(graph.nodes.get('n1')?.trust_score, 0.7);
    });

    it('analyzeTopology returns clusters, bridge_nodes, trust_concentration', () => {
      const nodes: TopologyNode[] = [
        { node_id: 'a', trust_score: 0.8, reputation_score: 0.7 },
        { node_id: 'b', trust_score: 0.6, reputation_score: 0.5 },
        { node_id: 'c', trust_score: 0.7, reputation_score: 0.6 },
      ];
      const edges: TopologyEdge[] = [
        { source_node: 'a', target_node: 'b', trust_weight: 0.9 },
        { source_node: 'b', target_node: 'c', trust_weight: 0.8 },
      ];
      const builder = new TopologyBuilder(dataSource(nodes, edges));
      const service = new TopologyService(builder, new TopologyAnalyzer());
      const result = service.analyzeTopology();
      assert.strictEqual(result.clusters.length, 1);
      assert.ok(result.bridge_nodes.includes('b'));
      assert.ok(Array.isArray(result.trust_concentration));
    });
  });
});
