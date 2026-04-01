/**
 * Step 6D — Governance activation readiness evaluator tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GovernanceActivationReadinessEvaluator } from './activationReadinessEvaluator.js';
import { GovernanceActuationGate } from '../governanceActuationGate.js';
import type { GovernanceSignal } from '../governanceTypes.js';
import type { GovernanceStabilityReport } from '../governanceSignalStabilityTypes.js';
import type { DynamicsReport } from '../../stability/dynamics/dynamicsTypes.js';

function sig(mode: GovernanceSignal['mode'], confidence = 0.9): GovernanceSignal {
  return Object.freeze({
    mode,
    budgetMultiplier: 1,
    commitRateMultiplier: 1,
    adaptationDampening: 1,
    confidence,
  });
}

function stableReport(): GovernanceStabilityReport {
  return Object.freeze({
    flipCount: 0,
    flipRate: 0,
    modePersistence: 10,
    multiplierVolatility: 0.05,
    entropy: 0.2,
    stable: true,
  });
}

function dynamicsReport(overrides: Partial<DynamicsReport>): DynamicsReport {
  return Object.freeze({
    convergenceStatus: 'CONVERGED',
    convergenceConfidence: 0.9,
    residualInstabilityScore: 0.15,
    trajectoryStabilityScore: 0.9,
    transitionFrequency: 0.1,
    envelopeResidence: { SAFE: 1000, STRESS: 0, CRITICAL: 0 },
    metaStability: false,
    plateauStrength: 'STRONG',
    shockDetected: false,
    shockCount: 0,
    ...overrides,
  });
}

describe('GovernanceActivationReadinessEvaluator', () => {
  it('1. Ready scenario: convergence high, residual risk low, gate approved → intentAllowed true', () => {
    const gate = new GovernanceActuationGate({ requiredStableCycles: 2 });
    for (let i = 0; i < 2; i++) gate.evaluate(sig('NORMAL'), stableReport());
    const evaluator = new GovernanceActivationReadinessEvaluator({ actuationGate: gate });
    const report = evaluator.evaluateActivationReadiness(
      'ADAPTIVE_WEIGHTS',
      sig('NORMAL', 0.9),
      dynamicsReport({
        residualInstabilityScore: 0.1,
        convergenceConfidence: 0.95,
        plateauStrength: 'STRONG',
        trajectoryStabilityScore: 0.95,
        transitionFrequency: 0.05,
      }),
      stableReport()
    );
    assert.strictEqual(report.intentAllowed, true);
    assert.strictEqual(report.recommendationText, 'READY_FOR_ACTIVATION');
  });

  it('2. Frozen mode → intentAllowed false', () => {
    const gate = new GovernanceActuationGate();
    const evaluator = new GovernanceActivationReadinessEvaluator({ actuationGate: gate });
    const report = evaluator.evaluateActivationReadiness(
      'ADAPTIVE_WEIGHTS',
      sig('FROZEN'),
      dynamicsReport({}),
      stableReport()
    );
    assert.strictEqual(report.intentAllowed, false);
    assert.strictEqual(report.recommendationText, 'SYSTEM_FROZEN');
  });

  it('3. Low confidence → intentAllowed false', () => {
    const gate = new GovernanceActuationGate({ requiredStableCycles: 1 });
    gate.evaluate(sig('NORMAL'), stableReport());
    const evaluator = new GovernanceActivationReadinessEvaluator({ actuationGate: gate });
    const report = evaluator.evaluateActivationReadiness(
      'ADAPTIVE_WEIGHTS',
      sig('NORMAL', 0.5),
      dynamicsReport({ convergenceConfidence: 0.4, residualInstabilityScore: 0.3 }),
      stableReport()
    );
    assert.strictEqual(report.intentAllowed, false);
    assert.ok(report.readinessConfidence < 0.75);
  });

  it('4. High residual risk → intentAllowed false', () => {
    const gate = new GovernanceActuationGate({ requiredStableCycles: 1 });
    gate.evaluate(sig('NORMAL'), stableReport());
    const evaluator = new GovernanceActivationReadinessEvaluator({ actuationGate: gate });
    const report = evaluator.evaluateActivationReadiness(
      'ADAPTIVE_WEIGHTS',
      sig('NORMAL', 0.9),
      dynamicsReport({
        residualInstabilityScore: 0.8,
        trajectoryStabilityScore: 0.2,
        transitionFrequency: 5,
      }),
      stableReport()
    );
    assert.strictEqual(report.intentAllowed, false);
    assert.ok(report.residualRiskScore > 0.35);
    assert.strictEqual(report.recommendationText, 'RISK_TOO_HIGH');
  });

  it('5. Determinism: same input sequence → same report', () => {
    const gate = new GovernanceActuationGate({ requiredStableCycles: 2 });
    gate.evaluate(sig('NORMAL'), stableReport());
    gate.evaluate(sig('NORMAL'), stableReport());
    const evaluator = new GovernanceActivationReadinessEvaluator({ actuationGate: gate });
    const signal = sig('NORMAL', 0.9);
    const dyn = dynamicsReport({ residualInstabilityScore: 0.1 });
    const stab = stableReport();
    const r1 = evaluator.evaluateActivationReadiness('ADAPTIVE_WEIGHTS', signal, dyn, stab);
    const r2 = evaluator.evaluateActivationReadiness('ADAPTIVE_WEIGHTS', signal, dyn, stab);
    assert.strictEqual(r1.intentAllowed, r2.intentAllowed);
    assert.strictEqual(r1.dynamicsSummaryScore, r2.dynamicsSummaryScore);
    assert.strictEqual(r1.residualRiskScore, r2.residualRiskScore);
    assert.strictEqual(r1.readinessConfidence, r2.readinessConfidence);
  });

  it('6. Stress 500 random snapshots: no NaN, scores in [0,1]', () => {
    const evaluator = new GovernanceActivationReadinessEvaluator();
    for (let i = 0; i < 500; i++) {
      const signal = sig(
        ['NORMAL', 'CONSERVATIVE', 'RECOVERY', 'FROZEN'][i % 4] as GovernanceSignal['mode'],
        Math.random()
      );
      const dyn = dynamicsReport({
        residualInstabilityScore: Math.random(),
        convergenceConfidence: Math.random(),
        trajectoryStabilityScore: Math.random(),
        transitionFrequency: Math.random() * 5,
        plateauStrength: ['STRONG', 'WEAK', 'FRAGILE'][i % 3] as DynamicsReport['plateauStrength'],
      });
      const stab: GovernanceStabilityReport = Object.freeze({
        flipCount: i % 10,
        flipRate: Math.random(),
        modePersistence: 1 + (i % 20),
        multiplierVolatility: Math.random(),
        entropy: Math.random(),
        stable: i % 3 === 0,
      });
      const report = evaluator.evaluateActivationReadiness(
        'ADAPTIVE_WEIGHTS',
        signal,
        dyn,
        stab
      );
      assert.ok(!Number.isNaN(report.dynamicsSummaryScore));
      assert.ok(!Number.isNaN(report.residualRiskScore));
      assert.ok(!Number.isNaN(report.readinessConfidence));
      assert.ok(report.dynamicsSummaryScore >= 0 && report.dynamicsSummaryScore <= 1);
      assert.ok(report.residualRiskScore >= 0 && report.residualRiskScore <= 1);
      assert.ok(report.readinessConfidence >= 0 && report.readinessConfidence <= 1);
    }
  });
});
