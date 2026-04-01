/**
 * Stability Layer — Unit and stress tests.
 * No oscillation under noisy input, delta cap, rate limit, hysteresis correctness.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AdaptiveRateLimiter } from './rateLimiter.js';
import { HysteresisController } from './hysteresis.js';

describe('AdaptiveRateLimiter', () => {
  it('enforces rate limit: maxActions per window', () => {
    const limiter = new AdaptiveRateLimiter({
      windowSizeMs: 1000,
      maxActions: 2,
      maxDelta: 1,
      smoothingAlpha: 0.5,
    });
    let t = 0;
    assert.strictEqual(limiter.canExecute(t), true);
    limiter.registerExecution(t);
    limiter.registerExecution(t);
    assert.strictEqual(limiter.canExecute(t), false);
    t = 1500;
    assert.strictEqual(limiter.canExecute(t), true);
  });

  it('enforces delta cap', () => {
    const limiter = new AdaptiveRateLimiter({
      windowSizeMs: 10000,
      maxActions: 100,
      maxDelta: 0.1,
      smoothingAlpha: 1,
    });
    const out = limiter.applyDeltaLimit(100, 120);
    assert.ok(Math.abs(out - 110) < 1e-6);
    const out2 = limiter.applyDeltaLimit(100, 80);
    assert.ok(Math.abs(out2 - 90) < 1e-6);
  });

  it('applies smoothing', () => {
    const limiter = new AdaptiveRateLimiter({
      windowSizeMs: 10000,
      maxActions: 100,
      maxDelta: 1,
      smoothingAlpha: 0.5,
    });
    const out = limiter.applySmoothing(10, 20);
    assert.strictEqual(out, 15);
  });

  it('executeGuarded returns stabilized value', () => {
    const limiter = new AdaptiveRateLimiter({
      windowSizeMs: 10000,
      maxActions: 10,
      maxDelta: 0.2,
      smoothingAlpha: 0.3,
    });
    let prev = 0;
    for (let i = 0; i < 5; i++) {
      const next = limiter.executeGuarded(prev, 1, i * 10);
      assert.ok(next >= 0 && next <= 1);
      prev = next;
    }
  });
});

describe('HysteresisController', () => {
  it('transitions only above upperThreshold or below lowerThreshold', () => {
    const ctrl = new HysteresisController({
      upperThreshold: 0.6,
      lowerThreshold: 0.4,
      initialState: 'NORMAL',
      minStateDurationMs: 0,
    });
    assert.strictEqual(ctrl.evaluate(0.5, 'URGENT', 'NORMAL', 0), 'NORMAL');
    assert.strictEqual(ctrl.evaluate(0.65, 'URGENT', 'NORMAL', 1), 'URGENT');
    assert.strictEqual(ctrl.evaluate(0.55, 'URGENT', 'NORMAL', 2), 'URGENT');
    assert.strictEqual(ctrl.evaluate(0.35, 'URGENT', 'NORMAL', 3), 'NORMAL');
  });

  it('blocks transition if minStateDuration not elapsed', () => {
    const ctrl = new HysteresisController({
      upperThreshold: 0.6,
      lowerThreshold: 0.4,
      initialState: 'NORMAL',
      minStateDurationMs: 100,
    });
    ctrl.evaluate(0.65, 'URGENT', 'NORMAL', 0);
    assert.strictEqual(ctrl.currentState, 'URGENT');
    ctrl.evaluate(0.35, 'URGENT', 'NORMAL', 50);
    assert.strictEqual(ctrl.currentState, 'URGENT');
    ctrl.evaluate(0.35, 'URGENT', 'NORMAL', 150);
    assert.strictEqual(ctrl.currentState, 'NORMAL');
  });

  it('forceState updates state and timestamp', () => {
    const ctrl = new HysteresisController({
      upperThreshold: 0.6,
      lowerThreshold: 0.4,
      initialState: 'NORMAL',
      minStateDurationMs: 0,
    });
    ctrl.forceState('URGENT', 100);
    assert.strictEqual(ctrl.currentState, 'URGENT');
    assert.strictEqual(ctrl.lastTransitionTimestamp, 100);
  });
});

describe('Stress: oscillating input', () => {
  it('state does not flip-flop under 0.51 -> 0.49 -> 0.52 -> 0.48', () => {
    const ctrl = new HysteresisController({
      upperThreshold: 0.55,
      lowerThreshold: 0.45,
      initialState: 'NORMAL',
      minStateDurationMs: 100,
    });
    const sequence = [0.51, 0.49, 0.52, 0.48, 0.51, 0.49];
    const states: string[] = [];
    for (let i = 0; i < sequence.length; i++) {
      const s = ctrl.evaluate(sequence[i], 'URGENT', 'NORMAL', i * 20) as string;
      states.push(s);
    }
    const changes = states.filter((s, i) => i > 0 && s !== states[i - 1]).length;
    assert.ok(changes <= 2, 'should not change state continuously (hysteresis reduces flip-flop)');
  });

  it('numeric output stabilizes under noisy input', () => {
    const limiter = new AdaptiveRateLimiter({
      windowSizeMs: 10000,
      maxActions: 100,
      maxDelta: 0.05,
      smoothingAlpha: 0.15,
    });
    const noisy = [0.51, 0.49, 0.52, 0.48, 0.51, 0.49, 0.52, 0.48, 0.50, 0.50];
    let prev = 0.5;
    const outputs: number[] = [];
    for (let i = 0; i < noisy.length; i++) {
      prev = limiter.executeGuarded(prev, noisy[i], i * 10);
      outputs.push(prev);
    }
    const mean = outputs.reduce((a, b) => a + b, 0) / outputs.length;
    const variance = outputs.reduce((acc, v) => acc + (v - mean) ** 2, 0) / outputs.length;
    assert.ok(variance < 0.02, 'output should be stabilized (variance < 0.02)');
  });
});
