/**
 * Step 6C — Governance actuation gate tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GovernanceActuationGate } from './governanceActuationGate.js';
import type { GovernanceSignal } from './governanceTypes.js';
import type { GovernanceStabilityReport } from './governanceSignalStabilityTypes.js';

function sig(mode: GovernanceSignal['mode']): GovernanceSignal {
  return Object.freeze({
    mode,
    budgetMultiplier: 1,
    commitRateMultiplier: 1,
    adaptationDampening: 1,
    confidence: 0.9,
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

function unstableReport(): GovernanceStabilityReport {
  return Object.freeze({
    flipCount: 5,
    flipRate: 0.5,
    modePersistence: 1,
    multiplierVolatility: 0.3,
    entropy: 0.8,
    stable: false,
  });
}

describe('GovernanceActuationGate', () => {
  it('1. Frozen mode blocks always (even if stable true for 10 cycles)', () => {
    const gate = new GovernanceActuationGate();
    const report = stableReport();
    for (let i = 0; i < 10; i++) {
      gate.evaluate(sig('NORMAL'), report);
    }
    const d = gate.evaluate(sig('FROZEN'), report);
    assert.strictEqual(d.allowed, false);
    assert.strictEqual(d.reason, 'FROZEN_MODE');
  });

  it('2. Unstable resets streak (stable x3 then false)', () => {
    const gate = new GovernanceActuationGate();
    gate.evaluate(sig('NORMAL'), stableReport());
    gate.evaluate(sig('NORMAL'), stableReport());
    gate.evaluate(sig('NORMAL'), stableReport());
    const d = gate.evaluate(sig('NORMAL'), unstableReport());
    assert.strictEqual(d.reason, 'NOT_STABLE');
    assert.strictEqual(d.stabilityStreak, 0);
    const d2 = gate.evaluate(sig('NORMAL'), stableReport());
    assert.strictEqual(d2.stabilityStreak, 1);
  });

  it('3. Does not reach requiredStableCycles (required=5, stable x4 → allowed false)', () => {
    const gate = new GovernanceActuationGate();
    const report = stableReport();
    let last: ReturnType<GovernanceActuationGate['evaluate']> = gate.evaluate(sig('NORMAL'), report);
    for (let i = 0; i < 3; i++) {
      last = gate.evaluate(sig('NORMAL'), report);
    }
    assert.strictEqual(last.allowed, false);
    assert.strictEqual(last.reason, 'INSUFFICIENT_STABILITY_HISTORY');
    assert.strictEqual(last.stabilityStreak, 4);
  });

  it('4. Reaches requiredStableCycles (stable x5 → allowed true)', () => {
    const gate = new GovernanceActuationGate();
    const report = stableReport();
    for (let i = 0; i < 4; i++) gate.evaluate(sig('NORMAL'), report);
    const d = gate.evaluate(sig('NORMAL'), report);
    assert.strictEqual(d.allowed, true);
    assert.strictEqual(d.reason, 'APPROVED');
    assert.strictEqual(d.stabilityStreak, 5);
  });

  it('5. After approval continues to be true (stable x6, x7 → allowed true, streak grows)', () => {
    const gate = new GovernanceActuationGate();
    const report = stableReport();
    for (let i = 0; i < 5; i++) gate.evaluate(sig('NORMAL'), report);
    const d5 = gate.evaluate(sig('NORMAL'), report);
    assert.strictEqual(d5.allowed, true);
    assert.strictEqual(d5.stabilityStreak, 6);
    const d6 = gate.evaluate(sig('NORMAL'), report);
    assert.strictEqual(d6.allowed, true);
    assert.strictEqual(d6.stabilityStreak, 7);
  });

  it('6. Custom requiredStableCycles (required=2, stable x2 → allowed true)', () => {
    const gate = new GovernanceActuationGate({ requiredStableCycles: 2 });
    const report = stableReport();
    gate.evaluate(sig('NORMAL'), report);
    const d = gate.evaluate(sig('NORMAL'), report);
    assert.strictEqual(d.allowed, true);
    assert.strictEqual(d.reason, 'APPROVED');
    assert.strictEqual(d.stabilityStreak, 2);
  });

  it('7. Determinism: same input sequence → same output sequence', () => {
    const gate1 = new GovernanceActuationGate();
    const gate2 = new GovernanceActuationGate();
    const report = stableReport();
    const results1: ReturnType<GovernanceActuationGate['evaluate']>[] = [];
    const results2: ReturnType<GovernanceActuationGate['evaluate']>[] = [];
    for (let i = 0; i < 6; i++) {
      results1.push(gate1.evaluate(sig('NORMAL'), report));
      results2.push(gate2.evaluate(sig('NORMAL'), report));
    }
    for (let i = 0; i < 6; i++) {
      assert.strictEqual(results1[i].allowed, results2[i].allowed);
      assert.strictEqual(results1[i].reason, results2[i].reason);
      assert.strictEqual(results1[i].stabilityStreak, results2[i].stabilityStreak);
    }
  });
});
