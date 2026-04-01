/**
 * Step 6B — Governance signal stability monitor tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GovernanceSignalStabilityMonitor } from './governanceSignalStabilityMonitor.js';
import type { GovernanceSignal } from './governanceTypes.js';

function sig(
  mode: GovernanceSignal['mode'],
  budget = 1,
  commit = 1,
  damp = 1,
  conf = 0.9
): GovernanceSignal {
  return Object.freeze({
    mode,
    budgetMultiplier: budget,
    commitRateMultiplier: commit,
    adaptationDampening: damp,
    confidence: conf,
  });
}

describe('GovernanceSignalStabilityMonitor', () => {
  it('1. No flip → stable true', () => {
    const mon = new GovernanceSignalStabilityMonitor(50);
    for (let i = 0; i < 15; i++) mon.observe(sig('NORMAL'));
    const r = mon.observe(sig('NORMAL'));
    assert.strictEqual(r.flipCount, 0);
    assert.strictEqual(r.flipRate, 0);
    assert.strictEqual(r.stable, true);
  });

  it('2. Continuous alternating flip → high flipRate → stable false', () => {
    const mon = new GovernanceSignalStabilityMonitor(50);
    for (let i = 0; i < 20; i++) {
      mon.observe(sig(i % 2 === 0 ? 'NORMAL' : 'CONSERVATIVE'));
    }
    const r = mon.observe(sig('NORMAL'));
    assert.ok(r.flipRate > 0.4);
    assert.strictEqual(r.stable, false);
  });

  it('3. High multiplier volatility → stable false', () => {
    const mon = new GovernanceSignalStabilityMonitor(50);
    for (let i = 0; i < 15; i++) {
      mon.observe(sig('NORMAL', 0.5 + (i % 5) * 0.2, 0.5 + (i % 3) * 0.35, i % 2));
    }
    const r = mon.observe(sig('NORMAL', 1, 1, 0.5));
    assert.ok(r.multiplierVolatility > 0.15);
    assert.strictEqual(r.stable, false);
  });

  it('4. High entropy (modes distributed equally) → stable false', () => {
    const mon = new GovernanceSignalStabilityMonitor(50);
    const modes: GovernanceSignal['mode'][] = ['NORMAL', 'CONSERVATIVE', 'RECOVERY', 'FROZEN'];
    for (let i = 0; i < 20; i++) {
      mon.observe(sig(modes[i % 4]));
    }
    const r = mon.observe(sig('NORMAL'));
    assert.ok(r.entropy >= 0.6);
    assert.strictEqual(r.stable, false);
  });

  it('5. High persistence → stable true', () => {
    const mon = new GovernanceSignalStabilityMonitor(50);
    for (let i = 0; i < 20; i++) mon.observe(sig('NORMAL', 1, 1, 1));
    const r = mon.observe(sig('NORMAL', 1, 1, 1));
    assert.ok(r.modePersistence >= 10);
    assert.strictEqual(r.stable, true);
  });

  it('6. All values in range [0,1] where applicable', () => {
    const mon = new GovernanceSignalStabilityMonitor(30);
    mon.observe(sig('NORMAL'));
    mon.observe(sig('CONSERVATIVE', 0.75, 0.8, 0.3));
    mon.observe(sig('NORMAL', 1, 1, 1));
    const r = mon.observe(sig('RECOVERY', 0.9, 0.9, 0.6));
    assert.ok(r.flipRate >= 0 && r.flipRate <= 1);
    assert.ok(r.multiplierVolatility >= 0 && r.multiplierVolatility <= 1);
    assert.ok(r.entropy >= 0 && r.entropy <= 1);
    assert.ok(r.modePersistence >= 0);
    assert.ok(Number.isInteger(r.flipCount) && r.flipCount >= 0);
  });
});

describe('GovernanceSignalStabilityMonitor edge', () => {
  it('buffer < 2 returns neutral stable report', () => {
    const mon = new GovernanceSignalStabilityMonitor(50);
    const r = mon.observe(sig('NORMAL'));
    assert.strictEqual(r.flipCount, 0);
    assert.strictEqual(r.flipRate, 0);
    assert.strictEqual(r.stable, true);
  });

  it('custom thresholds are applied', () => {
    const mon = new GovernanceSignalStabilityMonitor(20, {
      maxFlipRate: 0.5,
      maxVolatility: 0.5,
      maxEntropy: 0.9,
    });
    for (let i = 0; i < 10; i++) mon.observe(sig('NORMAL'));
    const r = mon.observe(sig('NORMAL'));
    assert.strictEqual(r.stable, true);
  });
});
