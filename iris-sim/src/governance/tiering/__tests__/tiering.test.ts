/**
 * Step 7A — Governance Maturity Engine tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  TIERING_MODEL_V1,
  validateTieringConfig,
  clamp01,
  normalizeLinear,
  normalizeLog,
  normalizeExp,
  applyTemporalDecay,
  applyStructuralFloor,
  aggregateScore,
  computeTierWithHysteresis,
  tierFromScore,
  mapTierToSLA,
  generateTierSnapshot,
  buildNormalizedVector,
} from '../index.js';
import type { GovernanceSnapshotForTiering } from '../hardCaps.js';
import type { TierState } from '../hysteresis.js';
import type { NormalizedMetricVector } from '../tieringModel.js';

function baseSnapshot(overrides?: Partial<GovernanceSnapshotForTiering>): GovernanceSnapshotForTiering {
  return Object.freeze({
    mode: 'NORMAL',
    budgetMultiplier: 0.9,
    commitRateMultiplier: 0.9,
    adaptationDampening: 0.2,
    confidence: 0.9,
    ...overrides,
  });
}

describe('Step 7A — Governance Maturity Engine', () => {
  it('1. score massimo → TIER_4_ENTERPRISE_READY', () => {
    const state: TierState = {
      currentTier: 'TIER_4_ENTERPRISE_READY',
      lastUpgradeAt: null,
      lastDowngradeAt: null,
    };
    const snap = baseSnapshot({
      flipRate: 0,
      entropyIndex: 0,
      invariantViolationCount: 0,
      violationFrequency: 0,
    });
    const out = generateTierSnapshot(snap, state);
    assert.strictEqual(out.tier, 'TIER_4_ENTERPRISE_READY');
    assert.ok(out.score >= 0.9);
  });

  it('2. invariant violation → cap TIER_2', () => {
    const state: TierState = {
      currentTier: 'TIER_4_ENTERPRISE_READY',
      lastUpgradeAt: null,
      lastDowngradeAt: null,
    };
    const snap = baseSnapshot({
      flipRate: 0,
      entropyIndex: 0,
      invariantViolationCount: 1,
      violationFrequency: 0,
    });
    const out = generateTierSnapshot(snap, state);
    assert.strictEqual(out.tier, 'TIER_2_CONTROLLED');
    assert.strictEqual(out.hardCapApplied, true);
  });

  it('3. stress test failure → cap TIER_3', () => {
    const state: TierState = {
      currentTier: 'TIER_4_ENTERPRISE_READY',
      lastUpgradeAt: null,
      lastDowngradeAt: null,
    };
    const snap = baseSnapshot({
      flipRate: 0,
      entropyIndex: 0,
      stressTestFailure: true,
    });
    const out = generateTierSnapshot(snap, state);
    assert.strictEqual(out.tier, 'TIER_3_STABLE');
    assert.strictEqual(out.hardCapApplied, true);
  });

  it('4. entropy spike → downgrade', () => {
    const state: TierState = {
      currentTier: 'TIER_4_ENTERPRISE_READY',
      lastUpgradeAt: null,
      lastDowngradeAt: null,
    };
    const snap = baseSnapshot({
      flipRate: 0,
      entropyIndex: 0.95,
      invariantViolationCount: 0,
    });
    const out = generateTierSnapshot(snap, state);
    assert.ok(
      out.tier !== 'TIER_4_ENTERPRISE_READY',
      'entropy spike (0.95) should prevent TIER_4 (score or cap)'
    );
  });

  it('5. hysteresis stabilizza oscillazioni', () => {
    const state: TierState = {
      currentTier: 'TIER_2_CONTROLLED',
      lastUpgradeAt: null,
      lastDowngradeAt: Date.now() - 1000,
    };
    const score = 0.61;
    const tier = computeTierWithHysteresis(score, state, null, null);
    assert.strictEqual(tier, 'TIER_2_CONTROLLED');
    const stateUp: TierState = {
      currentTier: 'TIER_2_CONTROLLED',
      lastUpgradeAt: null,
      lastDowngradeAt: null,
    };
    const tierUp = computeTierWithHysteresis(0.78, stateUp, null, null);
    assert.strictEqual(tierUp, 'TIER_3_STABLE');
  });

  it('6. structural floor attivo', () => {
    const vector: NormalizedMetricVector = Object.freeze({
      flipStability: 0.1,
      invariantIntegrity: 0.15,
      entropyControl: 0.18,
      violationPressure: 0.12,
    });
    const result = applyStructuralFloor(vector, true);
    assert.ok(result.adjustedVector.flipStability >= 0.2);
    assert.ok(result.adjustedVector.invariantIntegrity >= 0.2);
    assert.ok(result.structuralCapTier === 'TIER_2_CONTROLLED');
    assert.ok(result.globalPenalty > 0);
  });

  it('7. anti-gaming attivo', () => {
    const vector: NormalizedMetricVector = Object.freeze({
      flipStability: 0.5,
      invariantIntegrity: 0.02,
      entropyControl: 0.5,
      violationPressure: 0.5,
    });
    const result = applyStructuralFloor(vector, true);
    assert.strictEqual(result.adjustedVector.invariantIntegrity, 0.2);
  });

  it('8. aggregazione monotona', () => {
    const weights = TIERING_MODEL_V1.weights;
    const v1: NormalizedMetricVector = Object.freeze({
      flipStability: 0.8,
      invariantIntegrity: 0.8,
      entropyControl: 0.8,
      violationPressure: 0.8,
    });
    const v2: NormalizedMetricVector = Object.freeze({
      flipStability: 0.9,
      invariantIntegrity: 0.9,
      entropyControl: 0.9,
      violationPressure: 0.9,
    });
    const s1 = aggregateScore(v1, weights, true);
    const s2 = aggregateScore(v2, weights, true);
    assert.ok(s2 > s1);
  });

  it('9. stesso input → stesso snapshot', () => {
    const state: TierState = {
      currentTier: 'TIER_3_STABLE',
      lastUpgradeAt: null,
      lastDowngradeAt: null,
    };
    const snap = baseSnapshot({ flipRate: 0.05, entropyIndex: 0.2 });
    const a = generateTierSnapshot(snap, state);
    const b = generateTierSnapshot(snap, state);
    assert.strictEqual(a.tier, b.tier);
    assert.strictEqual(a.score, b.score);
    assert.strictEqual(a.modelVersion, b.modelVersion);
  });

  it('10. determinismo temporale', () => {
    const score = 0.7;
    const t1 = applyTemporalDecay(score, null, 0.001);
    const t2 = applyTemporalDecay(score, Date.now() - 10000, 0.001);
    assert.strictEqual(t1, score);
    assert.ok(t2 <= t1);
  });
});

describe('Tiering helpers', () => {
  it('validateTieringConfig throws if weights do not sum to 1', () => {
    assert.throws(() => {
      validateTieringConfig({
        ...TIERING_MODEL_V1,
        weights: {
          flipStability: 0.25,
          invariantIntegrity: 0.25,
          entropyControl: 0.25,
          violationPressure: 0.2,
        },
      });
    });
  });

  it('tierFromScore thresholds', () => {
    assert.strictEqual(tierFromScore(0), 'TIER_0_LOCKED');
    assert.strictEqual(tierFromScore(0.39), 'TIER_0_LOCKED');
    assert.strictEqual(tierFromScore(0.4), 'TIER_1_RESTRICTED');
    assert.strictEqual(tierFromScore(0.6), 'TIER_2_CONTROLLED');
    assert.strictEqual(tierFromScore(0.75), 'TIER_3_STABLE');
    assert.strictEqual(tierFromScore(0.9), 'TIER_4_ENTERPRISE_READY');
    assert.strictEqual(tierFromScore(1), 'TIER_4_ENTERPRISE_READY');
  });

  it('mapTierToSLA returns correct profile', () => {
    const t4 = mapTierToSLA('TIER_4_ENTERPRISE_READY');
    assert.strictEqual(t4.maxUptimeCommitment, 99.9);
    assert.strictEqual(t4.auditFrequencyDays, 14);
    assert.strictEqual(t4.certificationEligible, true);
    assert.strictEqual(t4.stressSimulationRequired, true);
    const t0 = mapTierToSLA('TIER_0_LOCKED');
    assert.strictEqual(t0.certificationEligible, false);
  });

  it('clamp01 and normalizations', () => {
    assert.strictEqual(clamp01(0.5), 0.5);
    assert.strictEqual(clamp01(-1), 0);
    assert.strictEqual(clamp01(2), 1);
    assert.strictEqual(clamp01(NaN), 0);
    assert.ok(normalizeLinear(5, 10) === 0.5);
    assert.ok(normalizeLog(0, 1) === 1);
    assert.ok(normalizeExp(0, 1) === 1);
  });

  it('buildNormalizedVector defaults', () => {
    const v = buildNormalizedVector({}, TIERING_MODEL_V1);
    assert.ok(v.flipStability >= 0.9);
    assert.strictEqual(v.invariantIntegrity, 1);
    assert.strictEqual(v.entropyControl, 1);
    assert.strictEqual(v.violationPressure, 1);
  });
});
