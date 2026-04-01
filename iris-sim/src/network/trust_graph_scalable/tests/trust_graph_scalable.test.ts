/**
 * Phase 13M — Scalable Trust Graph Engine. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  ScalableTrustGraphEngine,
  buildScalableTrustGraph,
  getNeighbors,
  getInboundNeighbors,
  computeTrustPropagation,
  type TrustWeightCalculator,
  DEFAULT_MAX_GRAPH_NODES,
} from '../index.js';
import type { NodeReputationProfile } from '../../reputation_engine/index.js';
import { DEFAULT_TRUST_POLICY } from '../../trust_policy/index.js';

function rep(node_id: string, reputation_score: number, last_updated: number): NodeReputationProfile {
  return Object.freeze({ node_id, reputation_score, last_updated });
}

describe('Scalable Trust Graph (13M)', () => {
  it('Small graph creation: nodes and edges', () => {
    const engine = new ScalableTrustGraphEngine();
    engine.addNode('a');
    engine.addNode('b');
    engine.addEdge({ source: 'a', target: 'b', weight: 0.8 });
    assert.strictEqual(engine.getNodeCount(), 2);
    assert.strictEqual(engine.getEdgeCount(), 1);
    const neighbors = engine.getNeighbors('a');
    assert.strictEqual(neighbors.length, 1);
    assert.strictEqual(neighbors[0]!.target, 'b');
    assert.strictEqual(neighbors[0]!.weight, 0.8);
  });

  it('buildScalableTrustGraph from reputation profiles', () => {
    const profiles: NodeReputationProfile[] = [
      rep('n1', 0.8, 1000),
      rep('n2', 0.6, 1000),
      rep('n3', 0.5, 1000),
    ];
    const graph = buildScalableTrustGraph(profiles);
    assert.strictEqual(graph.nodes.size, 3);
    let edgeCount = 0;
    for (const list of graph.edges.values()) edgeCount += list.length;
    assert.ok(edgeCount >= 3);
    const n1Neighbors = getNeighbors(graph, 'n1');
    assert.ok(n1Neighbors.length <= DEFAULT_TRUST_POLICY.trust_graph.max_edges_per_node);
  });

  it('Edge limit enforcement: max_edges_per_node respected', () => {
    const policy = { ...DEFAULT_TRUST_POLICY.trust_graph, max_edges_per_node: 2 };
    const engine = new ScalableTrustGraphEngine(policy);
    engine.addNode('x');
    for (let i = 0; i < 5; i++) {
      engine.addNode(`y${i}`);
      engine.addEdge({ source: 'x', target: `y${i}`, weight: 0.5 + i * 0.1 });
    }
    const out = engine.getNeighbors('x');
    assert.strictEqual(out.length, 2);
    assert.strictEqual(out[0]!.weight >= out[1]!.weight, true);
  });

  it('Trust propagation depth: bounded BFS', () => {
    const engine = new ScalableTrustGraphEngine();
    engine.addNode('a');
    engine.addNode('b');
    engine.addNode('c');
    engine.addEdge({ source: 'a', target: 'b', weight: 0.8 });
    engine.addEdge({ source: 'b', target: 'c', weight: 0.8 });
    const graph = engine.snapshot();
    const prop = computeTrustPropagation(graph, 'a', 5);
    assert.ok(prop.has('a'));
    assert.ok(prop.has('b'));
    assert.ok(prop.has('c'));
    const depthLimit = DEFAULT_TRUST_POLICY.trust_graph.trust_propagation_depth;
    assert.ok(depthLimit >= 0);
  });

  it('Deterministic traversal: same graph → same neighbor order', () => {
    const profiles: NodeReputationProfile[] = [
      rep('p1', 0.7, 1),
      rep('p2', 0.6, 1),
      rep('p3', 0.5, 1),
    ];
    const g1 = buildScalableTrustGraph(profiles);
    const g2 = buildScalableTrustGraph(profiles);
    const ids = [...g1.edges.keys()].sort();
    for (const id of ids) {
      const n1 = getNeighbors(g1, id);
      const n2 = getNeighbors(g2, id);
      assert.strictEqual(n1.length, n2.length);
      for (let i = 0; i < n1.length; i++) {
        assert.strictEqual(n1[i]!.target, n2[i]!.target);
        assert.strictEqual(n1[i]!.weight, n2[i]!.weight);
      }
    }
  });

  it('Incremental update: updateNodeTrust replaces edges', () => {
    const engine = new ScalableTrustGraphEngine();
    engine.addNode('u');
    engine.addNode('v1');
    engine.addNode('v2');
    engine.updateNodeTrust('u', [
      { source: 'u', target: 'v1', weight: 0.9 },
      { source: 'u', target: 'v2', weight: 0.7 },
    ]);
    assert.strictEqual(engine.getNeighbors('u').length, 2);
    engine.updateNodeTrust('u', [{ source: 'u', target: 'v2', weight: 0.95 }]);
    assert.strictEqual(engine.getNeighbors('u').length, 1);
    assert.strictEqual(engine.getNeighbors('u')[0]!.target, 'v2');
  });

  it('getInboundNeighbors: reverse index', () => {
    const graph = buildScalableTrustGraph([
      rep('a', 0.8, 1),
      rep('b', 0.6, 1),
      rep('c', 0.6, 1),
    ]);
    const inboundB = getInboundNeighbors(graph, 'b');
    assert.ok(Array.isArray(inboundB));
  });

  it('Policy-driven node limit: max_graph_nodes from policy', () => {
    assert.strictEqual(DEFAULT_MAX_GRAPH_NODES, 100_000);
    const policy = { ...DEFAULT_TRUST_POLICY.trust_graph, max_graph_nodes: 5 };
    const engine = new ScalableTrustGraphEngine(policy);
    for (let i = 0; i < 5; i++) engine.addNode(`n${i}`);
    assert.strictEqual(engine.getNodeCount(), 5);
    assert.throws(() => engine.addNode('n5'), /maximum node count \(5\) exceeded/);
  });

  it('TrustWeightCalculator injection: custom product formula', () => {
    const customCalculator: TrustWeightCalculator = {
      computeTrustWeight(source, target) {
        return Math.max(0, Math.min(1, source.reputation_score * target.reputation_score));
      },
    };
    const profiles: NodeReputationProfile[] = [
      rep('a', 0.8, 1),
      rep('b', 0.5, 1),
    ];
    const graph = buildScalableTrustGraph(profiles, undefined, customCalculator);
    const aEdges = getNeighbors(graph, 'a');
    const toB = aEdges.find((e) => e.target === 'b');
    assert.ok(toB);
    assert.strictEqual(toB!.weight, 0.8 * 0.5);
  });

  it('Reverse index invalidation: getInboundEdges reflects updateNodeTrust', () => {
    const engine = new ScalableTrustGraphEngine();
    engine.addNode('a');
    engine.addNode('b');
    engine.addNode('c');
    engine.addEdge({ source: 'a', target: 'b', weight: 0.8 });
    engine.addEdge({ source: 'c', target: 'b', weight: 0.6 });
    const inboundBefore = engine.getInboundEdges('b');
    assert.strictEqual(inboundBefore.length, 2);
    engine.updateNodeTrust('a', [{ source: 'a', target: 'c', weight: 0.9 }]);
    const inboundAfter = engine.getInboundEdges('b');
    assert.strictEqual(inboundAfter.length, 1);
    assert.strictEqual(inboundAfter[0]!.source, 'c');
  });

  it('Deterministic snapshot: node and edge order by node_id', () => {
    const engine = new ScalableTrustGraphEngine();
    engine.addNode('z');
    engine.addNode('a');
    engine.addNode('m');
    engine.addEdge({ source: 'a', target: 'z', weight: 0.5 });
    engine.addEdge({ source: 'a', target: 'm', weight: 0.5 });
    const { nodes, edges } = engine.snapshot();
    const nodeIds = [...nodes.keys()];
    assert.deepStrictEqual(nodeIds, ['a', 'm', 'z']);
    const edgeSources = [...edges.keys()];
    assert.deepStrictEqual(edgeSources, ['a']);
    const out = edges.get('a')!;
    assert.strictEqual(out[0]!.target, 'm');
    assert.strictEqual(out[1]!.target, 'z');
  });

  it('Builder ignores invalid profiles: missing node_id or score outside [0,1]', () => {
    const profiles: NodeReputationProfile[] = [
      rep('valid', 0.6, 1),
      { node_id: '', reputation_score: 0.5, last_updated: 1 } as NodeReputationProfile,
      { node_id: 'badScore', reputation_score: 1.5, last_updated: 1 } as NodeReputationProfile,
    ];
    const graph = buildScalableTrustGraph(profiles);
    assert.strictEqual(graph.nodes.size, 1);
    assert.ok(graph.nodes.has('valid'));
  });

  it('Edge ordering: weight DESC then target ASC', () => {
    const engine = new ScalableTrustGraphEngine();
    engine.addNode('x');
    engine.addNode('a');
    engine.addNode('b');
    engine.updateNodeTrust('x', [
      { source: 'x', target: 'a', weight: 0.3 },
      { source: 'x', target: 'b', weight: 0.9 },
    ]);
    const out = engine.getNeighbors('x');
    assert.strictEqual(out[0]!.weight, 0.9);
    assert.strictEqual(out[0]!.target, 'b');
    assert.strictEqual(out[1]!.weight, 0.3);
    assert.strictEqual(out[1]!.target, 'a');
  });
});

describe('Scalable Trust Graph — Stress', () => {
  it('Large graph (100 nodes): construction and deterministic results', () => {
    const n = 100;
    const profiles: NodeReputationProfile[] = [];
    for (let i = 0; i < n; i++) {
      profiles.push(rep(`stress-${i}`, 0.3 + (i % 70) / 100, 1));
    }
    const t0 = Date.now();
    const graph = buildScalableTrustGraph(profiles);
    const elapsed = Date.now() - t0;
    assert.strictEqual(graph.nodes.size, n);
    let edgeCount = 0;
    for (const list of graph.edges.values()) edgeCount += list.length;
    assert.ok(edgeCount <= n * DEFAULT_TRUST_POLICY.trust_graph.max_edges_per_node);
    const graph2 = buildScalableTrustGraph(profiles);
    const ids = [...graph.edges.keys()].sort();
    const ids2 = [...graph2.edges.keys()].sort();
    assert.deepStrictEqual(ids, ids2);
    assert.ok(elapsed < 30_000, 'construction should complete within 30s');
  });
});
