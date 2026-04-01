/**
 * Step 8B — Policy Engine tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parsePolicyDSL } from '../parser/policy_parser.js';
import { evaluatePolicy } from '../evaluator/policy_evaluator.js';
import { evaluatePolicies } from '../enforcement/enforcement_engine.js';
import { isFeatureAllowed } from '../feature_gate/feature_gate_resolver.js';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';

function makeSnapshot(overrides: {
  tier?: GovernanceTierSnapshot['tier'];
  score?: number;
  normalizedMetrics?: Partial<GovernanceTierSnapshot['normalizedMetrics']>;
}): GovernanceTierSnapshot {
  return Object.freeze({
    modelVersion: '7A_v1.0',
    score: overrides.score ?? 0.5,
    tier: overrides.tier ?? 'TIER_2_CONTROLLED',
    computedAt: Date.now(),
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

describe('Policy Engine', () => {
  it('Test 1 — Parsing DSL', () => {
    const dsl = `IF tier < TIER_2
THEN block_feature("autonomous_decision")`;
    const policy = parsePolicyDSL(dsl);
    assert.strictEqual(policy.condition.field, 'tier');
    assert.strictEqual(policy.condition.operator, '<');
    assert.strictEqual(policy.condition.value, 'TIER_2');
    assert.strictEqual(policy.action.type, 'block_feature');
    assert.strictEqual(policy.action.params?.feature, 'autonomous_decision');
  });

  it('Test 2 — Policy evaluation (tier < TIER_2, snapshot TIER_1 → true)', () => {
    const policy = parsePolicyDSL(
      'IF tier < TIER_2 THEN block_feature("x")',
      'test'
    );
    const snapshot = makeSnapshot({ tier: 'TIER_1_RESTRICTED' });
    const result = evaluatePolicy(policy, snapshot);
    assert.strictEqual(result, true);
  });

  it('Test 3 — Feature blocking (policy blocks feature → isFeatureAllowed false)', () => {
    const policy = parsePolicyDSL(
      'IF tier < TIER_2 THEN block_feature("autonomous_decision")',
      'block'
    );
    const snapshot = makeSnapshot({ tier: 'TIER_1_RESTRICTED' });
    const enforcement = evaluatePolicies([policy], snapshot);
    assert.strictEqual(isFeatureAllowed('autonomous_decision', enforcement), false);
  });

  it('Test 4 — Policy non attiva (tier TIER_3, condition tier < TIER_2 → false)', () => {
    const policy = parsePolicyDSL(
      'IF tier < TIER_2 THEN block_feature("x")',
      'test'
    );
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
    const result = evaluatePolicy(policy, snapshot);
    assert.strictEqual(result, false);
  });

  it('Test 5 — Aggregazione policy (due policy attive, feature bloccate aggregate)', () => {
    const p1 = parsePolicyDSL('IF tier < TIER_2 THEN block_feature("autonomous_decision")', 'p1');
    const p2 = parsePolicyDSL('IF tier < TIER_3 THEN block_feature("advanced_export")', 'p2');
    const snapshot = makeSnapshot({ tier: 'TIER_1_RESTRICTED' });
    const enforcement = evaluatePolicies([p1, p2], snapshot);
    assert.ok(enforcement.blockedFeatures.includes('autonomous_decision'));
    assert.ok(enforcement.blockedFeatures.includes('advanced_export'));
    assert.strictEqual(isFeatureAllowed('autonomous_decision', enforcement), false);
    assert.strictEqual(isFeatureAllowed('advanced_export', enforcement), false);
    assert.strictEqual(isFeatureAllowed('other_feature', enforcement), true);
  });
});
