/**
 * Trust Simulation Test Framework. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  generateNetwork,
  generateBehaviorProfile,
  runTrustSimulation,
  SimulatedNodeType,
} from '../index.js';

describe('Trust Simulation', () => {
  it('Test 1 — Network Generation: generateNetwork creates expected node count', () => {
    const nodes = generateNetwork(100);
    assert.strictEqual(nodes.length, 100);
    const byType = new Map<string, number>();
    for (const n of nodes) {
      const t = n.node_type;
      byType.set(t, (byType.get(t) ?? 0) + 1);
    }
    assert.strictEqual(byType.get(SimulatedNodeType.HONEST_NODE), 50);
    assert.strictEqual(byType.get(SimulatedNodeType.PASSIVE_NODE), 20);
    assert.strictEqual(byType.get(SimulatedNodeType.VALIDATOR_NODE), 15);
    assert.strictEqual(byType.get(SimulatedNodeType.HIGH_ACTIVITY_NODE), 10);
    assert.strictEqual(byType.get(SimulatedNodeType.ANOMALOUS_NODE), 5);
  });

  it('Test 2 — Behavior Generation: behavior profiles generated correctly', () => {
    const honest = { node_id: 'n1', node_type: SimulatedNodeType.HONEST_NODE };
    const profile = generateBehaviorProfile(honest, 1000, 42);
    assert.strictEqual(profile.node_id, 'n1');
    assert.ok(profile.total_events >= 40 && profile.total_events <= 60);
    assert.ok(profile.consensus_votes >= 20 && profile.consensus_votes <= 30);
    assert.ok(profile.validations_performed >= 10 && profile.validations_performed <= 20);
    assert.ok(profile.governance_actions >= 1 && profile.governance_actions <= 5);

    const anomalous = { node_id: 'n2', node_type: SimulatedNodeType.ANOMALOUS_NODE };
    const anom = generateBehaviorProfile(anomalous, 2000, 0);
    assert.strictEqual(anom.total_events, 200);
    assert.strictEqual(anom.consensus_votes, 0);
    assert.strictEqual(anom.validations_performed, 0);
  });

  it('Test 3 — Simulation Execution: reputations computed, baseline generated', () => {
    const config = {
      node_count: 20,
      simulation_rounds: 3,
      timestamp_start: 1000,
      timestamp_step: 100,
      seed: 123,
    };
    const result = runTrustSimulation(config);
    assert.ok(Array.isArray(result.reputation_distribution));
    assert.strictEqual(result.reputation_distribution.length, 20);
    assert.ok(typeof result.baseline_activity === 'number');
    assert.ok(result.baseline_activity >= 0);
    assert.ok(result.node_reputations instanceof Map);
    assert.strictEqual(result.node_reputations.size, 20);
  });

  it('Test 4 — Reputation Spread: distribution spans multiple ranges', () => {
    const config = {
      node_count: 50,
      simulation_rounds: 5,
      timestamp_start: 0,
      timestamp_step: 200,
      seed: 456,
    };
    const result = runTrustSimulation(config);
    const dist = result.reputation_distribution;
    const min = Math.min(...dist);
    const max = Math.max(...dist);
    assert.ok(max - min >= 0.1, 'reputation spread should span at least 0.1');
    const low = dist.filter((s) => s < 0.3).length;
    const high = dist.filter((s) => s > 0.7).length;
    assert.ok(low >= 1 || high >= 1, 'distribution should have some low or high scores');
  });

  it('Test 5 — Deterministic Simulation: same seed → identical results', () => {
    const config = {
      node_count: 30,
      simulation_rounds: 2,
      timestamp_start: 500,
      timestamp_step: 50,
      seed: 999,
    };
    const r1 = runTrustSimulation(config);
    const r2 = runTrustSimulation(config);
    assert.deepStrictEqual(r1.reputation_distribution, r2.reputation_distribution);
    assert.strictEqual(r1.baseline_activity, r2.baseline_activity);
    assert.strictEqual(r1.node_reputations.size, r2.node_reputations.size);
    for (const [id, score] of r1.node_reputations) {
      assert.strictEqual(r2.node_reputations.get(id), score);
    }
  });
});
