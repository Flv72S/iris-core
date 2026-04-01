/**
 * Step 8D — Governance Runtime Gate tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import { evaluateRuntimeAction } from '../engine/governance_runtime_gate.js';

function makeSnapshot(overrides: {
  tier?: GovernanceTierSnapshot['tier'];
  score?: number;
  normalizedMetrics?: Partial<GovernanceTierSnapshot['normalizedMetrics']>;
}): GovernanceTierSnapshot {
  return Object.freeze({
    modelVersion: '7A_v1.0',
    score: overrides.score ?? 0.5,
    tier: overrides.tier ?? 'TIER_2_CONTROLLED',
    computedAt: 1000,
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

describe('Governance Runtime Gate', () => {
  it('Test 1 — Feature consentita: TIER_3, advanced_analysis → allowed true', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
    const decision = evaluateRuntimeAction(
      { action: 'run', requestedFeatures: ['advanced_analysis'] },
      snapshot,
      emptyEnforcement
    );
    assert.strictEqual(decision.allowed, true);
  });

  it('Test 2 — Feature non consentita: TIER_1, autonomous_decision → allowed false, reason feature_not_allowed', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_1_RESTRICTED' });
    const decision = evaluateRuntimeAction(
      { action: 'run', requestedFeatures: ['autonomous_decision'] },
      snapshot,
      emptyEnforcement
    );
    assert.strictEqual(decision.allowed, false);
    assert.strictEqual(decision.reason, 'feature_not_allowed');
  });

  it('Test 3 — Policy block: policy blocca autonomous_decision, feature richiesta autonomous_decision → allowed false', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_4_ENTERPRISE_READY' });
    const enforcement: PolicyEnforcementResult = Object.freeze({
      blockedFeatures: ['autonomous_decision'],
      allowedFeatures: [],
    });
    const decision = evaluateRuntimeAction(
      { action: 'run', requestedFeatures: ['autonomous_decision'] },
      snapshot,
      enforcement
    );
    assert.strictEqual(decision.allowed, false);
  });

  it('Test 4 — Audit propagation: policy increase_audit_frequency → auditMultiplier > 1', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_2_CONTROLLED' });
    const enforcement: PolicyEnforcementResult = Object.freeze({
      blockedFeatures: [],
      allowedFeatures: [],
      auditFrequencyMultiplier: 2,
    });
    const decision = evaluateRuntimeAction(
      { action: 'run' },
      snapshot,
      enforcement
    );
    assert.ok(decision.auditMultiplier > 1);
    assert.strictEqual(decision.auditMultiplier, 2);
  });

  it('Test 5 — Determinism: stesso input → stesso RuntimeDecision', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.82 });
    const request: { action: string; requestedFeatures: string[] } = {
      action: 'run',
      requestedFeatures: ['assisted_decision'],
    };
    const a = evaluateRuntimeAction(request, snapshot, emptyEnforcement);
    const b = evaluateRuntimeAction(request, snapshot, emptyEnforcement);
    assert.strictEqual(a.allowed, b.allowed);
    assert.strictEqual(a.reason, b.reason);
    assert.strictEqual(a.autonomyLevel, b.autonomyLevel);
    assert.strictEqual(a.auditMultiplier, b.auditMultiplier);
    assert.strictEqual(a.safetyConstraintLevel, b.safetyConstraintLevel);
    assert.deepStrictEqual([...a.allowedFeatures], [...b.allowedFeatures]);
  });
});
