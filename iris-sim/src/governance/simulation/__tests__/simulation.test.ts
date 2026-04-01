/**
 * Step 7D — Governance simulation tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  runGovernanceSimulation,
  computeResilienceMetrics,
  STRESS_SCENARIOS,
  applySimulationEvent,
  perturbMetric,
  rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo,
  projectTier,
} from '../index.js';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';

function baseSnapshot(tier: GovernanceTierSnapshot['tier'], score: number): GovernanceTierSnapshot {
  return Object.freeze({
    modelVersion: '7A_v1.0',
    score,
    tier,
    computedAt: 1000000,
    normalizedMetrics: Object.freeze({
      flipStability: 0.9,
      invariantIntegrity: 0.9,
      entropyControl: 0.9,
      violationPressure: 0.9,
    }),
    hardCapApplied: false,
    structuralCapApplied: false,
  });
}

describe('Step 7D — Simulation', () => {
  it('1. scenario Invariant Crisis', () => {
    const scenario = STRESS_SCENARIOS.find((s) => s.name === 'Invariant Crisis')!;
    const snap = baseSnapshot('TIER_3_STABLE', 0.8);
    const result = runGovernanceSimulation(snap, scenario);
    assert.strictEqual(result.scenarioName, 'Invariant Crisis');
    assert.strictEqual(result.steps, 20);
    assert.strictEqual(result.scoreTimeline.length, 20);
    assert.strictEqual(result.tierTimeline.length, 20);
    assert.ok(result.initialTier === 'TIER_3_STABLE');
    const metrics = computeResilienceMetrics(result.scoreTimeline, result.tierTimeline);
    assert.ok(metrics.maxScoreDrop >= 0);
  });

  it('2. Flip Instability', () => {
    const scenario = STRESS_SCENARIOS.find((s) => s.name === 'Flip Instability')!;
    const snap = baseSnapshot('TIER_2_CONTROLLED', 0.7);
    const result = runGovernanceSimulation(snap, scenario);
    assert.strictEqual(result.scenarioName, 'Flip Instability');
    assert.strictEqual(result.steps, 30);
    assert.ok(result.scoreTimeline[0] !== undefined);
    assert.ok(result.finalTier !== undefined);
  });

  it('3. Entropy Drift prolungata', () => {
    const scenario = STRESS_SCENARIOS.find((s) => s.name === 'Entropy Drift')!;
    const snap = baseSnapshot('TIER_3_STABLE', 0.82);
    const result = runGovernanceSimulation(snap, scenario);
    assert.strictEqual(result.scenarioName, 'Entropy Drift');
    assert.strictEqual(result.steps, 40);
    const midScores = result.scoreTimeline.slice(5, 25);
    assert.ok(midScores.length > 0);
  });

  it('4. Recovery Simulation', () => {
    const scenario = STRESS_SCENARIOS.find((s) => s.name === 'Recovery Simulation')!;
    const snap = baseSnapshot('TIER_3_STABLE', 0.8);
    const result = runGovernanceSimulation(snap, scenario);
    assert.strictEqual(result.scenarioName, 'Recovery Simulation');
    assert.strictEqual(result.steps, 40);
    const lastScore = result.scoreTimeline[result.scoreTimeline.length - 1];
    assert.ok(typeof lastScore === 'number' && lastScore >= 0 && lastScore <= 1);
  });

  it('5. determinismo simulazione', () => {
    const scenario = STRESS_SCENARIOS[0]!;
    const snap = baseSnapshot('TIER_2_CONTROLLED', 0.65);
    const a = runGovernanceSimulation(snap, scenario);
    const b = runGovernanceSimulation(snap, scenario);
    assert.strictEqual(a.modelVersion, b.modelVersion);
    assert.deepStrictEqual([...a.scoreTimeline], [...b.scoreTimeline]);
    assert.deepStrictEqual([...a.tierTimeline], [...b.tierTimeline]);
    assert.strictEqual(a.finalTier, b.finalTier);
  });

  it('6. stabilità numerica score', () => {
    const scenario = STRESS_SCENARIOS[0]!;
    const snap = baseSnapshot('TIER_4_ENTERPRISE_READY', 0.92);
    const result = runGovernanceSimulation(snap, scenario);
    for (let i = 0; i < result.scoreTimeline.length; i++) {
      const s = result.scoreTimeline[i]!;
      assert.ok(Number.isFinite(s), `score at ${i} is finite`);
      assert.ok(s >= 0 && s <= 1, `score at ${i} in [0,1]`);
    }
  });

  it('7. consistenza tier projection', () => {
    const state = { currentTier: 'TIER_2_CONTROLLED' as const, lastUpgradeAt: null, lastDowngradeAt: null };
    assert.strictEqual(projectTier(0.9, state), 'TIER_4_ENTERPRISE_READY');
    assert.strictEqual(projectTier(0.75, state), 'TIER_3_STABLE');
    assert.strictEqual(projectTier(0.5, state), 'TIER_1_RESTRICTED');
    assert.strictEqual(projectTier(0.35, state), 'TIER_0_LOCKED');
  });
});

describe('Perturbation and events', () => {
  it('perturbMetric clamps to [0,1]', () => {
    assert.strictEqual(perturbMetric(0.5, 1, 'decrease'), 0.2);
    assert.strictEqual(perturbMetric(0, 1, 'decrease'), 0);
    assert.strictEqual(perturbMetric(1, 1, 'increase'), 1);
  });

  it('applySimulationEvent reduces metric for stress events', () => {
    const metrics = { flipStability: 0.9, invariantIntegrity: 0.9, entropyControl: 0.9, violationPressure: 0.9 };
    const out = applySimulationEvent(metrics, { type: 'INVARIANT_VIOLATION', intensity: 0.8, durationSteps: 5 });
    assert.ok(out.invariantIntegrity < 0.9);
  });

  it('rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo returns score in [0,1]', () => {
    const s = rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo({
      flipStability: 0.9,
      invariantIntegrity: 0.9,
      entropyControl: 0.9,
      violationPressure: 0.9,
    });
    assert.ok(s >= 0 && s <= 1);
  });
});

describe('Resilience metrics', () => {
  it('computeResilienceMetrics', () => {
    const scores = [0.8, 0.5, 0.4, 0.6, 0.75];
    const tiers = ['TIER_3_STABLE', 'TIER_2_CONTROLLED', 'TIER_1_RESTRICTED', 'TIER_2_CONTROLLED', 'TIER_3_STABLE'] as const;
    const m = computeResilienceMetrics(scores, tiers);
    assert.ok(m.maxScoreDrop >= 0.4);
    assert.ok(m.tierVolatility >= 0);
  });
});
