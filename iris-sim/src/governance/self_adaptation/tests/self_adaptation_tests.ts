/**
 * Step 8C — Self-Adaptation Engine tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import { getAdaptationProfileForTier } from '../profiles/adaptation_profiles.js';
import { computeAdaptationSnapshot } from '../engine/self_adaptation_engine.js';
import { withAdaptationHash } from '../snapshot/adaptation_snapshot.js';
import { computeAuditMultiplier } from '../strategies/audit_strategy.js';
import { computeSafetyConstraintLevel } from '../strategies/safety_strategy.js';

function makeSnapshot(overrides: {
  tier?: GovernanceTierSnapshot['tier'];
  score?: number;
  computedAt?: number;
  normalizedMetrics?: Partial<GovernanceTierSnapshot['normalizedMetrics']>;
}): GovernanceTierSnapshot {
  return Object.freeze({
    modelVersion: '7A_v1.0',
    score: overrides.score ?? 0.5,
    tier: overrides.tier ?? 'TIER_2_CONTROLLED',
    computedAt: overrides.computedAt ?? 1000,
    normalizedMetrics: Object.freeze({
      flipStability: 0.8,
      invariantIntegrity: 0.9,
      entropyControl: 0.7,
      violationPressure: 0.2,
      ...overrides.normalizedMetrics,
    }),
    hardCapApplied: false,
    structuralCapApplied: false,
  });
}

const emptyEnforcement: PolicyEnforcementResult = Object.freeze({
  blockedFeatures: [],
  allowedFeatures: [],
});

describe('Self-Adaptation Engine', () => {
  it('Test 1 — Tier mapping: TIER_0 → autonomy DISABLED', () => {
    const profile = getAdaptationProfileForTier('TIER_0_LOCKED');
    assert.strictEqual(profile.autonomy, 'DISABLED');
    const snapshot = makeSnapshot({ tier: 'TIER_0_LOCKED' });
    const result = computeAdaptationSnapshot(snapshot, emptyEnforcement);
    assert.strictEqual(result.adaptation_profile.autonomy, 'DISABLED');
  });

  it('Test 2 — Feature gating: policy blocks autonomous_decision → removed from result', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_4_ENTERPRISE_READY' });
    const enforcement: PolicyEnforcementResult = Object.freeze({
      blockedFeatures: ['autonomous_decision'],
      allowedFeatures: [],
    });
    const result = computeAdaptationSnapshot(snapshot, enforcement);
    assert.ok(!result.adaptation_profile.allowedFeatureSet.includes('autonomous_decision'));
    assert.ok(result.adaptation_profile.allowedFeatureSet.includes('basic_analysis'));
  });

  it('Test 3 — Audit multiplier merge: profile 1.5, policy 2 → final 2', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_2_CONTROLLED' });
    const enforcement: PolicyEnforcementResult = Object.freeze({
      blockedFeatures: [],
      allowedFeatures: [],
      auditFrequencyMultiplier: 2,
    });
    const mult = computeAuditMultiplier(snapshot, enforcement);
    assert.strictEqual(mult, 2);
  });

  it('Test 4 — Violation pressure safety escalation: violationPressure > 0.5 → level increases', () => {
    const lowPressure = makeSnapshot({
      tier: 'TIER_2_CONTROLLED',
      normalizedMetrics: { violationPressure: 0.2 },
    });
    const highPressure = makeSnapshot({
      tier: 'TIER_2_CONTROLLED',
      normalizedMetrics: { violationPressure: 0.6 },
    });
    const levelLow = computeSafetyConstraintLevel(lowPressure);
    const levelHigh = computeSafetyConstraintLevel(highPressure);
    assert.ok(levelHigh > levelLow);
  });

  it('Test 5 — Determinism: same input → identical adaptation_hash', () => {
    const snapshot = makeSnapshot({
      tier: 'TIER_3_STABLE',
      score: 0.82,
      computedAt: 2000,
    });
    const a = withAdaptationHash(computeAdaptationSnapshot(snapshot, emptyEnforcement));
    const b = withAdaptationHash(computeAdaptationSnapshot(snapshot, emptyEnforcement));
    assert.strictEqual(a.adaptation_hash, b.adaptation_hash);
  });
});
