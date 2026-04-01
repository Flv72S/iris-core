/**
 * Stability Step 5B — Proportional impact estimator tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ImpactEstimator } from './impactEstimator.js';

function commitReq(key: string, value: unknown): { sandboxId: string; localKey: string; value: unknown; timestamp: number } {
  return { sandboxId: 's1', localKey: key, value, timestamp: Date.now() };
}

describe('ImpactEstimator proportional', () => {
  const est = new ImpactEstimator();

  it('1.00 to 1.01 produces impact < 0.02', () => {
    const prev = { x: 1 };
    const req = commitReq('x', 1.01);
    const e = est.estimateImpact('m', req, prev);
    assert.ok(e.impactScore < 0.02);
  });

  it('1.00 to 1.50 produces impact ~0.5', () => {
    const prev = { x: 1 };
    const req = commitReq('x', 1.5);
    const e = est.estimateImpact('m', req, prev);
    assert.ok(e.impactScore >= 0.45 && e.impactScore <= 0.55);
  });

  it('1.00 to 2.00 produces impact ~1.0 (clamped)', () => {
    const prev = { x: 1 };
    const req = commitReq('x', 2);
    const e = est.estimateImpact('m', req, prev);
    assert.ok(e.impactScore >= 0.99 && e.impactScore <= 1.01);
  });

  it('3 keys with small deltas produce impact < 0.2', () => {
    const prev = { weights: { weightA: 1, weightB: 1, weightC: 1 } };
    const req = commitReq('weights', { weightA: 1.02, weightB: 0.99, weightC: 1.01 });
    const e = est.estimateImpact('m', req, prev);
    assert.ok(e.impactScore < 0.2);
  });

  it('new key produces impact = 1', () => {
    const prev: Record<string, unknown> = {};
    const req = commitReq('newKey', 42);
    const e = est.estimateImpact('m', req, prev);
    assert.strictEqual(e.impactScore, 1);
  });

  it('non-numeric produces impact = 1', () => {
    const prev: Record<string, unknown> = {};
    const req = commitReq('k', 'string');
    const e = est.estimateImpact('m', req, prev);
    assert.strictEqual(e.impactScore, 1);
  });
});
