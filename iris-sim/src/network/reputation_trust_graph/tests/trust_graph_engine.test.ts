/**
 * Phase 13B — Trust Graph Engine. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildTrustGraph,
  propagateTrust,
  applyTrustDecay,
  computeTrustGraph,
} from '../index.js';
import type { NodeReputationProfile } from '../../reputation_engine/index.js';

function rep(node_id: string, reputation_score: number, last_updated: number): NodeReputationProfile {
  return Object.freeze({ node_id, reputation_score, last_updated });
}

describe('Trust Graph Engine (13B)', () => {
  it('Test 1 — Graph Creation: buildTrustGraph generates nodes and edges', () => {
    const reputations: NodeReputationProfile[] = [
      rep('n1', 0.8, 1000),
      rep('n2', 0.5, 1000),
      rep('n3', 0.3, 1000),
    ];
    const graph = buildTrustGraph(reputations);
    assert.strictEqual(graph.nodes.size, 3);
    assert.ok(graph.edges.length >= 1);
    assert.ok(graph.nodes.has('n1'));
    assert.ok(graph.nodes.has('n2'));
    assert.ok(graph.nodes.has('n3'));
  });

  it('Test 2 — Edge Weight Range: 0 ≤ trust_weight ≤ 1', () => {
    const reputations: NodeReputationProfile[] = [
      rep('a', 0.5, 1000),
      rep('b', 0.5, 1000),
    ];
    const graph = buildTrustGraph(reputations);
    for (const e of graph.edges) {
      assert.ok(e.trust_weight >= 0 && e.trust_weight <= 1);
    }
    const decayed = applyTrustDecay(graph, 0.95);
    for (const e of decayed.edges) {
      assert.ok(e.trust_weight >= 0 && e.trust_weight <= 1);
    }
  });

  it('Test 3 — Trust Propagation: A→B, B→C produces A→C', () => {
    const reputations: NodeReputationProfile[] = [
      rep('A', 0.9, 1000),
      rep('B', 0.9, 1000),
      rep('C', 0.9, 1000),
    ];
    const base = buildTrustGraph(reputations);
    const hasAB = base.edges.some((e) => e.from_node === 'A' && e.to_node === 'B');
    const hasBC = base.edges.some((e) => e.from_node === 'B' && e.to_node === 'C');
    assert.ok(hasAB, 'base should have A->B');
    assert.ok(hasBC, 'base should have B->C');
    const propagated = propagateTrust(base, 0.5);
    const hasAC = propagated.edges.some((e) => e.from_node === 'A' && e.to_node === 'C');
    assert.ok(hasAC, 'propagation should produce A->C');
  });

  it('Test 4 — Trust Decay: new_weight < original_weight', () => {
    const reputations: NodeReputationProfile[] = [
      rep('x', 0.8, 1000),
      rep('y', 0.8, 1000),
    ];
    const graph = buildTrustGraph(reputations);
    const before = graph.edges[0]?.trust_weight ?? 0;
    const decayed = applyTrustDecay(graph, 0.95);
    const after = decayed.edges[0]?.trust_weight ?? 0;
    assert.ok(after < before || before === 0);
  });

  it('Test 5 — Edge Limit: at most 50 outgoing edges per node', () => {
    const reputations: NodeReputationProfile[] = [];
    for (let i = 0; i < 60; i++) {
      reputations.push(rep(`node-${i}`, 0.5 + (i % 5) * 0.1, 1000));
    }
    const graph = buildTrustGraph(reputations);
    const outByNode = new Map<string, number>();
    for (const e of graph.edges) {
      outByNode.set(e.from_node, (outByNode.get(e.from_node) ?? 0) + 1);
    }
    for (const [, count] of outByNode) {
      assert.ok(count <= 50, 'each node must have at most 50 outgoing edges');
    }
  });

  it('Test 6 — Deterministic Graph: compute twice → identical', () => {
    const reputations: NodeReputationProfile[] = [
      rep('p', 0.7, 2000),
      rep('q', 0.4, 2000),
      rep('r', 0.6, 2000),
    ];
    const g1 = computeTrustGraph(reputations);
    const g2 = computeTrustGraph(reputations);
    assert.strictEqual(g1.nodes.size, g2.nodes.size);
    assert.strictEqual(g1.edges.length, g2.edges.length);
    const edges1 = [...g1.edges].sort((a, b) =>
      a.from_node !== b.from_node
        ? a.from_node.localeCompare(b.from_node)
        : a.to_node.localeCompare(b.to_node)
    );
    const edges2 = [...g2.edges].sort((a, b) =>
      a.from_node !== b.from_node
        ? a.from_node.localeCompare(b.from_node)
        : a.to_node.localeCompare(b.to_node)
    );
    assert.deepStrictEqual(
      edges1.map((e) => ({ from: e.from_node, to: e.to_node, w: e.trust_weight })),
      edges2.map((e) => ({ from: e.from_node, to: e.to_node, w: e.trust_weight }))
    );
  });
});
