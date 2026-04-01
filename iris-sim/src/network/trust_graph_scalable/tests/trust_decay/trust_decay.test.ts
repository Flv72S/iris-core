/**
 * Phase 13XX-B — Adaptive Trust Propagation Decay. Tests.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  TrustDecayPolicyProvider,
  TrustDecayCalculator,
  DEFAULT_TRUST_DECAY_POLICY,
  ScalableTrustGraphEngine,
  TrustPropagationEngine,
  TrustPropagationCache,
} from '../../index.js';
import { NodeIdentityRegistry } from '../../../node_identity/index.js';
import { DEFAULT_TRUST_POLICY } from '../../../trust_policy/index.js';

describe('Trust Decay (Phase 13XX-B)', () => {
  describe('decay factor computation', () => {
    it('returns base × modifier for known node type', () => {
      const provider = new TrustDecayPolicyProvider(DEFAULT_TRUST_DECAY_POLICY);
      const calc = new TrustDecayCalculator(provider);
      const humanDecay = calc.computeDecayFactor('HUMAN');
      assert.strictEqual(humanDecay, 0.9 * 1.0);
      assert.strictEqual(humanDecay, 0.9);
      const aiDecay = calc.computeDecayFactor('THIRD_PARTY_AI');
      assert.strictEqual(aiDecay, 0.9 * 0.85);
      assert.strictEqual(Math.round(aiDecay * 1000) / 1000, 0.765);
    });

    it('getDefaultDecayFactor returns base only', () => {
      const provider = new TrustDecayPolicyProvider(DEFAULT_TRUST_DECAY_POLICY);
      const calc = new TrustDecayCalculator(provider);
      assert.strictEqual(calc.getDefaultDecayFactor(), 0.9);
    });
  });

  describe('different node types produce different decay', () => {
    it('HUMAN decay > THIRD_PARTY_AI decay', () => {
      const provider = new TrustDecayPolicyProvider(DEFAULT_TRUST_DECAY_POLICY);
      const calc = new TrustDecayCalculator(provider);
      const humanDecay = calc.computeDecayFactor('HUMAN');
      const aiDecay = calc.computeDecayFactor('THIRD_PARTY_AI');
      assert.ok(humanDecay > aiDecay);
      assert.strictEqual(humanDecay, 0.9);
      assert.strictEqual(Math.round(aiDecay * 1000) / 1000, 0.765);
    });

    it('IOT_DEVICE has lower decay than HUMAN', () => {
      const provider = new TrustDecayPolicyProvider(DEFAULT_TRUST_DECAY_POLICY);
      const calc = new TrustDecayCalculator(provider);
      const humanDecay = calc.computeDecayFactor('HUMAN');
      const iotDecay = calc.computeDecayFactor('IOT_DEVICE');
      assert.ok(iotDecay < humanDecay);
      assert.strictEqual(iotDecay, 0.9 * 0.75);
    });
  });

  describe('fallback when node identity missing', () => {
    it('computeDecayFactor for unknown type uses 1.0 modifier', () => {
      const provider = new TrustDecayPolicyProvider(DEFAULT_TRUST_DECAY_POLICY);
      const calc = new TrustDecayCalculator(provider);
      const unknownDecay = calc.computeDecayFactor('UNKNOWN_TYPE');
      assert.strictEqual(unknownDecay, 0.9 * 1.0);
      assert.strictEqual(unknownDecay, 0.9);
    });

    it('propagation uses default decay when no registry', () => {
      const policy = {
        ...DEFAULT_TRUST_POLICY.trust_graph,
        trust_propagation_depth: 3,
        trust_decay_factor: 0.9,
      };
      const graph = new ScalableTrustGraphEngine(policy);
      graph.addNode('a');
      graph.addNode('b');
      graph.addEdge({ source: 'a', target: 'b', weight: 1 });
      const decayProvider = new TrustDecayPolicyProvider(DEFAULT_TRUST_DECAY_POLICY);
      const decayCalc = new TrustDecayCalculator(decayProvider);
      const engine = new TrustPropagationEngine(graph, new TrustPropagationCache(), {
        decayCalculator: decayCalc,
      });
      const result = engine.propagateTrust('a');
      assert.strictEqual(result.propagated_scores.get('b'), 0.9);
    });
  });

  describe('propagation integration test', () => {
    it('adaptive decay: THIRD_PARTY_AI node receives lower propagated score than HUMAN', () => {
      const policy = {
        ...DEFAULT_TRUST_POLICY.trust_graph,
        trust_propagation_depth: 3,
        trust_decay_factor: 0.9,
      };
      const graph = new ScalableTrustGraphEngine(policy);
      graph.addNode('source');
      graph.addNode('human');
      graph.addNode('ai');
      graph.addEdge({ source: 'source', target: 'human', weight: 1 });
      graph.addEdge({ source: 'source', target: 'ai', weight: 1 });

      const registry = new NodeIdentityRegistry();
      registry.registerNode({
        node_id: 'human',
        node_type: 'HUMAN',
        provider: 'Test',
      });
      registry.registerNode({
        node_id: 'ai',
        node_type: 'THIRD_PARTY_AI',
        provider: 'OpenAI',
        public_key: 'pk',
      });

      const decayProvider = new TrustDecayPolicyProvider(DEFAULT_TRUST_DECAY_POLICY);
      const decayCalc = new TrustDecayCalculator(decayProvider);
      const engine = new TrustPropagationEngine(graph, new TrustPropagationCache(), {
        decayCalculator: decayCalc,
        nodeRegistry: registry,
      });

      const result = engine.propagateTrust('source');
      const humanScore = result.propagated_scores.get('human');
      const aiScore = result.propagated_scores.get('ai');
      assert.ok(humanScore !== undefined);
      assert.ok(aiScore !== undefined);
      assert.strictEqual(humanScore, 0.9);
      assert.strictEqual(Math.round(aiScore * 1000) / 1000, 0.765);
      assert.ok(aiScore < humanScore);
    });

    it('fallback when node not in registry: uses default decay', () => {
      const policy = {
        ...DEFAULT_TRUST_POLICY.trust_graph,
        trust_propagation_depth: 3,
        trust_decay_factor: 0.9,
      };
      const graph = new ScalableTrustGraphEngine(policy);
      graph.addNode('source');
      graph.addNode('unregistered');
      graph.addEdge({ source: 'source', target: 'unregistered', weight: 1 });

      const registry = new NodeIdentityRegistry();
      const decayProvider = new TrustDecayPolicyProvider(DEFAULT_TRUST_DECAY_POLICY);
      const decayCalc = new TrustDecayCalculator(decayProvider);
      const engine = new TrustPropagationEngine(graph, new TrustPropagationCache(), {
        decayCalculator: decayCalc,
        nodeRegistry: registry,
      });

      const result = engine.propagateTrust('source');
      const score = result.propagated_scores.get('unregistered');
      assert.strictEqual(Math.round(score! * 1000) / 1000, 0.9);
    });
  });

  describe('policy provider', () => {
    it('uses adaptive_decay from trust graph when present', () => {
      const customPolicy = {
        base_decay_factor: 0.8,
        node_type_decay: { HUMAN: 1.0, THIRD_PARTY_AI: 0.7 },
      };
      const provider = new TrustDecayPolicyProvider({
        ...DEFAULT_TRUST_POLICY.trust_graph,
        adaptive_decay: customPolicy,
      });
      const calc = new TrustDecayCalculator(provider);
      assert.strictEqual(calc.computeDecayFactor('HUMAN'), 0.8);
      assert.strictEqual(Math.round(calc.computeDecayFactor('THIRD_PARTY_AI') * 100) / 100, 0.56);
    });

    it('observability: onDecayUsage called with node_type', () => {
      const provider = new TrustDecayPolicyProvider(DEFAULT_TRUST_DECAY_POLICY);
      const used: string[] = [];
      const calc = new TrustDecayCalculator(provider, {
        onDecayUsage: (node_type) => used.push(node_type),
      });
      calc.computeDecayFactor('HUMAN');
      calc.computeDecayFactor('THIRD_PARTY_AI');
      assert.deepStrictEqual(used, ['HUMAN', 'THIRD_PARTY_AI']);
    });
  });
});
