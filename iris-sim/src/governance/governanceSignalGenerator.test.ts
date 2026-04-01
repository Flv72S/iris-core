/**
 * Step 6A — Governance signal generator tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GovernanceSignalGenerator } from './governanceSignalGenerator.js';
import { DefaultGovernanceConfig } from './governanceTypes.js';
import type { DynamicsReport } from '../stability/dynamics/dynamicsTypes.js';

function report(overrides: Partial<DynamicsReport>): DynamicsReport {
  return Object.freeze({
    convergenceStatus: 'CONVERGED',
    convergenceConfidence: 0.9,
    residualInstabilityScore: 0.2,
    trajectoryStabilityScore: 0.9,
    transitionFrequency: 0,
    envelopeResidence: { SAFE: 1000, STRESS: 0, CRITICAL: 0 },
    metaStability: false,
    plateauStrength: 'STRONG',
    shockDetected: false,
    shockCount: 0,
    ...overrides,
  });
}

describe('GovernanceSignalGenerator', () => {
  it('1. Frozen regime: residualInstabilityScore 0.9 → mode FROZEN, budget 0.5, adaptationDampening 0', () => {
    const gen = new GovernanceSignalGenerator();
    const sig = gen.generate(report({ residualInstabilityScore: 0.9 }));
    assert.strictEqual(sig.mode, 'FROZEN');
    assert.strictEqual(sig.budgetMultiplier, 0.5);
    assert.strictEqual(sig.adaptationDampening, 0);
  });

  it('2. Conservative regime: risk 0.7 → mode CONSERVATIVE, budgetMultiplier 0.75', () => {
    const gen = new GovernanceSignalGenerator();
    const sig = gen.generate(report({ residualInstabilityScore: 0.7 }));
    assert.strictEqual(sig.mode, 'CONSERVATIVE');
    assert.strictEqual(sig.budgetMultiplier, 0.75);
  });

  it('3. Strong plateau converged: low risk, CONVERGED, STRONG → NORMAL, budget > 1, adaptationDampening 1', () => {
    const gen = new GovernanceSignalGenerator();
    const sig = gen.generate(
      report({ residualInstabilityScore: 0.1, convergenceStatus: 'CONVERGED', plateauStrength: 'STRONG' })
    );
    assert.strictEqual(sig.mode, 'NORMAL');
    assert.ok(sig.budgetMultiplier > 1);
    assert.strictEqual(sig.adaptationDampening, 1);
  });

  it('4. Weak plateau converged → budgetMultiplier = weakPlateauBoost', () => {
    const gen = new GovernanceSignalGenerator();
    const sig = gen.generate(
      report({ residualInstabilityScore: 0.2, convergenceStatus: 'CONVERGED', plateauStrength: 'WEAK' })
    );
    assert.strictEqual(sig.mode, 'NORMAL');
    assert.strictEqual(sig.budgetMultiplier, DefaultGovernanceConfig.weakPlateauBoost);
  });

  it('5. Meta-stability reduces commit rate', () => {
    const gen = new GovernanceSignalGenerator();
    const sigNormal = gen.generate(report({ metaStability: false, residualInstabilityScore: 0.2 }));
    const sigMeta = gen.generate(report({ metaStability: true, residualInstabilityScore: 0.2, convergenceStatus: 'TRANSIENT' }));
    assert.ok(sigMeta.commitRateMultiplier < sigNormal.commitRateMultiplier || sigMeta.mode !== 'NORMAL');
    assert.ok(sigMeta.commitRateMultiplier <= 0.9);
  });

  it('6. Shock reduces adaptation', () => {
    const gen = new GovernanceSignalGenerator();
    const sigNoShock = gen.generate(report({ shockDetected: false, residualInstabilityScore: 0.1 }));
    const sigShock = gen.generate(report({ shockDetected: true, residualInstabilityScore: 0.1 }));
    assert.ok(sigShock.adaptationDampening < sigNoShock.adaptationDampening);
  });
});

describe('GovernanceSignalGenerator bounds', () => {
  it('all fields in bounds', () => {
    const gen = new GovernanceSignalGenerator();
    const sig = gen.generate(report({}));
    assert.ok(sig.budgetMultiplier >= 0.5 && sig.budgetMultiplier <= 1.2);
    assert.ok(sig.commitRateMultiplier >= 0.5 && sig.commitRateMultiplier <= 1.2);
    assert.ok(sig.adaptationDampening >= 0 && sig.adaptationDampening <= 1);
    assert.ok(sig.confidence >= 0 && sig.confidence <= 1);
  });
});
