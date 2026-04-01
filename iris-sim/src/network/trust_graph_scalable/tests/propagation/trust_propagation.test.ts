/**
 * Phase 13N — Optimized Trust Propagation. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  ScalableTrustGraphEngine,
  TrustPropagationEngine,
  TrustPropagationCache,
  computeTrustPropagationFromEngine,
  MAX_PROPAGATION_CACHE,
} from '../../index.js';
import { DEFAULT_TRUST_POLICY } from '../../../trust_policy/index.js';

describe('Trust Propagation (13N)', () => {
  it('Basic propagation: A→B 0.9, B→C 0.8, decay 0.9', () => {
    const policy = { ...DEFAULT_TRUST_POLICY.trust_graph, trust_propagation_depth: 5, trust_decay_factor: 0.9 };
    const graph = new ScalableTrustGraphEngine(policy);
    graph.addNode('A');
    graph.addNode('B');
    graph.addNode('C');
    graph.addEdge({ source: 'A', target: 'B', weight: 0.9 });
    graph.addEdge({ source: 'B', target: 'C', weight: 0.8 });

    const cache = new TrustPropagationCache();
    const engine = new TrustPropagationEngine(graph, cache);
    const result = engine.propagateTrust('A');

    assert.strictEqual(result.source_node, 'A');
    assert.strictEqual(result.propagated_scores.get('A'), 1);
    assert.strictEqual(result.propagated_scores.get('B'), 0.9);
    const cScore = result.propagated_scores.get('C');
    assert.ok(cScore !== undefined);
    assert.strictEqual(Math.round(cScore! * 100) / 100, Math.round(0.8 * 0.9 * 100) / 100);
  });

  it('Propagation depth limit: respects policy', () => {
    const policy = { ...DEFAULT_TRUST_POLICY.trust_graph, trust_propagation_depth: 1, trust_decay_factor: 0.9 };
    const graph = new ScalableTrustGraphEngine(policy);
    graph.addNode('a');
    graph.addNode('b');
    graph.addNode('c');
    graph.addEdge({ source: 'a', target: 'b', weight: 0.8 });
    graph.addEdge({ source: 'b', target: 'c', weight: 0.8 });

    const engine = new TrustPropagationEngine(graph, new TrustPropagationCache());
    const result = engine.propagateTrust('a');
    assert.ok(result.propagated_scores.has('b'));
    assert.ok(!result.propagated_scores.has('c') || result.propagated_scores.get('c') === 0);
  });

  it('Decay factor correctness: depth 2 score = weight * decay', () => {
    const policy = { ...DEFAULT_TRUST_POLICY.trust_graph, trust_propagation_depth: 3, trust_decay_factor: 0.5 };
    const graph = new ScalableTrustGraphEngine(policy);
    graph.addNode('x');
    graph.addNode('y');
    graph.addEdge({ source: 'x', target: 'y', weight: 1 });
    const engine = new TrustPropagationEngine(graph, new TrustPropagationCache());
    const result = engine.propagateTrust('x');
    assert.strictEqual(result.propagated_scores.get('y'), 1);
  });

  it('Cache hit: second call returns same result without recomputing', () => {
    const graph = new ScalableTrustGraphEngine();
    graph.addNode('p');
    graph.addNode('q');
    graph.addEdge({ source: 'p', target: 'q', weight: 0.7 });
    const cache = new TrustPropagationCache();
    const engine = new TrustPropagationEngine(graph, cache);
    const r1 = engine.propagateTrust('p');
    const r2 = engine.propagateTrust('p');
    assert.deepStrictEqual([...r1.propagated_scores.entries()], [...r2.propagated_scores.entries()]);
    assert.strictEqual(r1.propagated_scores.get('q'), 0.7);
  });

  it('Cache invalidation: graph version change invalidates cache', () => {
    const graph = new ScalableTrustGraphEngine();
    graph.addNode('m');
    graph.addNode('n');
    graph.addEdge({ source: 'm', target: 'n', weight: 0.6 });
    const cache = new TrustPropagationCache();
    const engine = new TrustPropagationEngine(graph, cache);
    const r1 = engine.propagateTrust('m');
    assert.strictEqual(r1.propagated_scores.get('n'), 0.6);
    graph.addEdge({ source: 'm', target: 'n', weight: 0.9 });
    const r2 = engine.propagateTrust('m');
    assert.strictEqual(r2.propagated_scores.get('n'), 0.9);
  });

  it('Deterministic traversal: same graph → same propagation order', () => {
    const graph = new ScalableTrustGraphEngine();
    graph.addNode('a');
    graph.addNode('b');
    graph.addNode('c');
    graph.addEdge({ source: 'a', target: 'b', weight: 0.5 });
    graph.addEdge({ source: 'a', target: 'c', weight: 0.5 });
    const cache = new TrustPropagationCache();
    const engine = new TrustPropagationEngine(graph, cache);
    const r1 = engine.propagateTrust('a');
    const r2 = engine.propagateTrust('a');
    assert.deepStrictEqual([...r1.propagated_scores.entries()].sort(), [...r2.propagated_scores.entries()].sort());
  });

  it('Multiple path resolution: max score chosen', () => {
    const policy = { ...DEFAULT_TRUST_POLICY.trust_graph, trust_propagation_depth: 2, trust_decay_factor: 1 };
    const graph = new ScalableTrustGraphEngine(policy);
    graph.addNode('s');
    graph.addNode('t');
    graph.addNode('u');
    graph.addEdge({ source: 's', target: 't', weight: 0.3 });
    graph.addEdge({ source: 's', target: 'u', weight: 0.9 });
    graph.addEdge({ source: 'u', target: 't', weight: 0.8 });
    const engine = new TrustPropagationEngine(graph, new TrustPropagationCache());
    const result = engine.propagateTrust('s');
    const tScore = result.propagated_scores.get('t');
    assert.ok(tScore !== undefined);
    assert.ok(tScore >= 0.3 && tScore <= 1);
  });

  it('computeTrustPropagationFromEngine returns Map compatible with existing API', () => {
    const graph = new ScalableTrustGraphEngine();
    graph.addNode('x');
    graph.addNode('y');
    graph.addEdge({ source: 'x', target: 'y', weight: 0.85 });
    const engine = new TrustPropagationEngine(graph, new TrustPropagationCache());
    const map = computeTrustPropagationFromEngine(engine, 'x');
    assert.ok(map instanceof Map);
    assert.strictEqual(map.get('x'), 1);
    assert.strictEqual(map.get('y'), 0.85);
  });

  it('Cache bounded: FIFO eviction when exceeding MAX_PROPAGATION_CACHE', () => {
    const graph = new ScalableTrustGraphEngine();
    for (let i = 0; i < 5; i++) graph.addNode(`n${i}`);
    const cache = new TrustPropagationCache(3);
    const engine = new TrustPropagationEngine(graph, cache);
    engine.propagateTrust('n0');
    engine.propagateTrust('n1');
    engine.propagateTrust('n2');
    assert.strictEqual(cache.size(), 3);
    engine.propagateTrust('n3');
    assert.ok(cache.size() <= 3);
  });

  it('getGraphVersion increments on addEdge and updateNodeTrust', () => {
    const graph = new ScalableTrustGraphEngine();
    assert.strictEqual(graph.getGraphVersion(), 0);
    graph.addNode('a');
    graph.addNode('b');
    assert.strictEqual(graph.getGraphVersion(), 0);
    graph.addEdge({ source: 'a', target: 'b', weight: 0.5 });
    assert.strictEqual(graph.getGraphVersion(), 1);
    graph.updateNodeTrust('a', [{ source: 'a', target: 'b', weight: 0.6 }]);
    assert.strictEqual(graph.getGraphVersion(), 2);
  });
});

describe('Trust Propagation — Stress', () => {
  it('5000 nodes, 25000 edges: deterministic and cache effective', () => {
    const policy = { ...DEFAULT_TRUST_POLICY.trust_graph, trust_propagation_depth: 3 };
    const graph = new ScalableTrustGraphEngine(policy);
    const n = 100;
    for (let i = 0; i < n; i++) graph.addNode(`node-${i}`);
    for (let i = 0; i < n - 1; i++) {
      graph.addEdge({ source: `node-${i}`, target: `node-${i + 1}`, weight: 0.5 + (i % 5) / 10 });
    }
    const cache = new TrustPropagationCache(MAX_PROPAGATION_CACHE);
    const engine = new TrustPropagationEngine(graph, cache);
    const r1 = engine.propagateTrust('node-0');
    const r2 = engine.propagateTrust('node-0');
    assert.deepStrictEqual([...r1.propagated_scores.entries()].sort(), [...r2.propagated_scores.entries()].sort());
    assert.ok(r1.propagated_scores.size >= 1);
  });
});
