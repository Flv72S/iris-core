/**
 * Step 6E — Hardening invariant engine tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { HardeningInvariantEngine } from './hardeningInvariantEngine.js';
import type { DynamicsSnapshot } from './invariantTypes.js';
import type { GovernanceSignalSnapshot } from '../governanceSignalStabilityTypes.js';

function dyn(
  ts: number,
  residual: number,
  plateau: DynamicsSnapshot['plateauStrength'] = 'STRONG',
  envelope: DynamicsSnapshot['envelopeState'] = 'SAFE'
): DynamicsSnapshot {
  return Object.freeze({ timestamp: ts, residualInstabilityScore: residual, plateauStrength: plateau, envelopeState: envelope });
}

function gov(
  mode: GovernanceSignalSnapshot['mode'],
  overrides?: Partial<GovernanceSignalSnapshot>
): GovernanceSignalSnapshot {
  return Object.freeze({
    mode,
    budgetMultiplier: 0.9,
    commitRateMultiplier: 0.9,
    adaptationDampening: 0.2,
    confidence: 0.9,
    ...overrides,
  });
}

describe('HardeningInvariantEngine', () => {
  it('1. Regime stable → systemSafe = true', () => {
    const engine = new HardeningInvariantEngine({ windowSize: 20, hardeningThreshold: 0.85 });
    const t0 = Date.now() - 20_000;
    const dynHist: DynamicsSnapshot[] = [];
    const govHist: GovernanceSignalSnapshot[] = [];
    for (let i = 0; i < 20; i++) {
      dynHist.push(dyn(t0 + i * 1000, 0.1 + i * 0.001, 'STRONG', 'SAFE'));
      govHist.push(gov('NORMAL'));
    }
    const report = engine.verifyDynamicsInvariants(dynHist, govHist);
    assert.strictEqual(report.systemSafe, true, 'systemSafe should be true under stable regime');
    assert.ok(report.globalHardeningIndex >= 0.85);
    assert.ok(report.invariantResults.every((r) => !r.violated));
  });

  it('2. Oscillation artificiale → invariant violation', () => {
    const engine = new HardeningInvariantEngine({ windowSize: 30, hardeningThreshold: 0.85 });
    const t0 = Date.now() - 30_000;
    const dynHist: DynamicsSnapshot[] = [];
    const govHist: GovernanceSignalSnapshot[] = [];
    const modes: GovernanceSignalSnapshot['mode'][] = ['NORMAL', 'CONSERVATIVE', 'RECOVERY', 'FROZEN'];
    for (let i = 0; i < 30; i++) {
      dynHist.push(dyn(t0 + i * 1000, 0.3, 'WEAK', i % 2 === 0 ? 'SAFE' : 'STRESS'));
      govHist.push(gov(modes[i % 4]));
    }
    const report = engine.verifyDynamicsInvariants(dynHist, govHist);
    assert.ok(
      report.invariantResults.some((r) => r.violated),
      'some invariant should be violated under mode oscillation'
    );
    const hysteresis = report.invariantResults.find((r) => r.invariantName === 'HYSTERESIS_PERSISTENCE');
    assert.ok(hysteresis?.violated === true, 'HYSTERESIS_PERSISTENCE should be violated when flip rate high');
  });

  it('3. Plateau fragile → regimeConsistencyScore basso', () => {
    const engine = new HardeningInvariantEngine({ windowSize: 25 });
    const t0 = Date.now() - 25_000;
    const dynHist: DynamicsSnapshot[] = [];
    const govHist: GovernanceSignalSnapshot[] = [];
    for (let i = 0; i < 25; i++) {
      dynHist.push(dyn(t0 + i * 1000, 0.5 + (i % 3) * 0.2, 'FRAGILE', i % 3 === 0 ? 'SAFE' : i % 3 === 1 ? 'STRESS' : 'CRITICAL'));
      govHist.push(gov('NORMAL'));
    }
    const report = engine.verifyDynamicsInvariants(dynHist, govHist);
    assert.ok(
      report.regimeConsistencyScore < 0.9,
      'regimeConsistencyScore should be relatively low with fragile plateau and mixed envelope'
    );
  });

  it('4. Recovery monotonicity violation → severity > 0', () => {
    const engine = new HardeningInvariantEngine({ windowSize: 20, epsilon: 0.0001 });
    const t0 = Date.now() - 20_000;
    const dynHist: DynamicsSnapshot[] = [];
    const govHist: GovernanceSignalSnapshot[] = [];
    for (let i = 0; i < 20; i++) {
      let r = 0.2;
      if (i >= 4 && i <= 10) {
        r = 0.2 + (i - 4) * (i - 4) * 0.01;
      }
      dynHist.push(dyn(t0 + i * 1000, r, 'STRONG', 'SAFE'));
      govHist.push(gov('RECOVERY'));
    }
    const report = engine.verifyDynamicsInvariants(dynHist, govHist);
    const mono = report.invariantResults.find((x) => x.invariantName === 'MONOTONICITY_UNDER_RECOVERY');
    assert.ok(mono, 'MONOTONICITY_UNDER_RECOVERY result present');
    if (mono.violated) {
      assert.ok(mono.severityScore > 0, 'monotonicity violation should have severity > 0');
    }
    assert.ok(report.monotonicityScore <= 1 && report.monotonicityScore >= 0);
  });

  it('5. Stress 500 snapshot random → no NaN, score ∈ [0,1]', () => {
    const engine = new HardeningInvariantEngine({ windowSize: 50 });
    const dynHist: DynamicsSnapshot[] = [];
    const govHist: GovernanceSignalSnapshot[] = [];
    const plateaus: DynamicsSnapshot['plateauStrength'][] = ['STRONG', 'WEAK', 'FRAGILE'];
    const envelopes: DynamicsSnapshot['envelopeState'][] = ['SAFE', 'STRESS', 'CRITICAL'];
    const modes: GovernanceSignalSnapshot['mode'][] = ['NORMAL', 'CONSERVATIVE', 'RECOVERY', 'FROZEN'];
    let seed = 42;
    for (let i = 0; i < 500; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fff_ffff;
      const r = (seed % 1000) / 1000;
      seed = (seed * 1103515245 + 12345) & 0x7fff_ffff;
      dynHist.push(
        dyn(
          Date.now() - (500 - i) * 100,
          r,
          plateaus[seed % 3],
          envelopes[seed % 3]
        )
      );
      seed = (seed * 1103515245 + 12345) & 0x7fff_ffff;
      govHist.push(gov(modes[seed % 4]));
    }
    const report = engine.verifyDynamicsInvariants(dynHist, govHist);
    assert.ok(!Number.isNaN(report.regimeConsistencyScore), 'regimeConsistencyScore not NaN');
    assert.ok(!Number.isNaN(report.hysteresisPersistenceScore), 'hysteresisPersistenceScore not NaN');
    assert.ok(!Number.isNaN(report.monotonicityScore), 'monotonicityScore not NaN');
    assert.ok(!Number.isNaN(report.globalHardeningIndex), 'globalHardeningIndex not NaN');
    assert.ok(report.regimeConsistencyScore >= 0 && report.regimeConsistencyScore <= 1);
    assert.ok(report.hysteresisPersistenceScore >= 0 && report.hysteresisPersistenceScore <= 1);
    assert.ok(report.monotonicityScore >= 0 && report.monotonicityScore <= 1);
    assert.ok(report.globalHardeningIndex >= 0 && report.globalHardeningIndex <= 1);
    for (const ir of report.invariantResults) {
      assert.ok(!Number.isNaN(ir.severityScore) && ir.severityScore >= 0 && ir.severityScore <= 1);
      assert.ok(!Number.isNaN(ir.confidence) && ir.confidence >= 0 && ir.confidence <= 1);
    }
  });

  it('6. Short history (n<2) → safe default report', () => {
    const engine = new HardeningInvariantEngine();
    const report = engine.verifyDynamicsInvariants(
      [dyn(1, 0.5, 'STRONG', 'SAFE')],
      [gov('NORMAL')]
    );
    assert.strictEqual(report.systemSafe, true);
    assert.strictEqual(report.invariantResults.length, 0);
    assert.strictEqual(report.regimeConsistencyScore, 1);
    assert.strictEqual(report.globalHardeningIndex, 1);
  });

  it('7. Config defaults applied', () => {
    const engine = new HardeningInvariantEngine();
    const t0 = Date.now() - 10_000;
    const dynHist = Array.from({ length: 10 }, (_, i) => dyn(t0 + i * 1000, 0.1, 'STRONG', 'SAFE'));
    const govHist = Array.from({ length: 10 }, () => gov('NORMAL'));
    const report = engine.verifyDynamicsInvariants(dynHist, govHist);
    assert.ok(report.timestamp > 0);
    assert.strictEqual(report.invariantResults.length, 3);
  });
});
