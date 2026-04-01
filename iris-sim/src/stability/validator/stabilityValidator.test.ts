/**
 * Stability Step 3 — Validator tests.
 * Low impact approved, single over limit rejected, cumulative rejected, cooldown, ledger, estimator, window reset, stress.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StabilityValidator } from './stabilityValidator.js';
import { ImpactEstimator } from './impactEstimator.js';
import { collectStabilityValidatorMetrics } from './stabilityMetrics.js';

const defaultConfig = () => ({
  maxGlobalImpactScorePerWindow: 100,
  maxSingleCommitImpact: 10,
  windowSizeMs: 5000,
  cooldownMs: 100,
});

function commitReq(key: string, value: unknown, ts?: number): { sandboxId: string; localKey: string; value: unknown; timestamp: number } {
  return { sandboxId: 's1', localKey: key, value, timestamp: ts ?? Date.now() };
}

describe('StabilityValidator', () => {
  it('low impact commit is approved', () => {
    const v = new StabilityValidator(defaultConfig());
    const req = commitReq('x', 1);
    const result = v.validateCommit('mod', req);
    assert.strictEqual(result.approved, true);
    assert.ok(result.estimatedImpact >= 0);
  });

  it('single commit impact over maxSingleCommitImpact is rejected', () => {
    const v = new StabilityValidator({
      ...defaultConfig(),
      maxSingleCommitImpact: 0.5,
    });
    const req = commitReq('x', 'big'); // overwrite => 1 + 0 + 1.5 = 2.5
    const result = v.validateCommit('mod', req);
    assert.strictEqual(result.approved, false);
    assert.strictEqual(result.reason, 'single_commit_over_limit');
  });

  it('cumulative impact over maxGlobalImpactScorePerWindow leads to rejection', () => {
    const v = new StabilityValidator({
      ...defaultConfig(),
      maxGlobalImpactScorePerWindow: 5,
      maxSingleCommitImpact: 10,
    });
    for (let i = 0; i < 10; i++) {
      const r = v.validateCommit('mod', commitReq(`k${i}`, 0));
      if (!r.approved) break;
    }
    const entries = v.budgetController.ledger.getEntries();
    const rejected = entries.filter((e) => !e.approved).length;
    assert.ok(rejected >= 1);
  });

  it('cooldown is active after violation', () => {
    const v = new StabilityValidator({
      ...defaultConfig(),
      maxSingleCommitImpact: 0.1,
      cooldownMs: 200,
    });
    v.validateCommit('mod', commitReq('x', 'over')); // rejected
    const m = collectStabilityValidatorMetrics(v);
    assert.strictEqual(m.cooldownActive, true);
  });

  it('ledger records entries correctly', () => {
    const v = new StabilityValidator(defaultConfig());
    v.validateCommit('A', commitReq('k1', 1));
    v.validateCommit('B', commitReq('k2', 2));
    const entries = v.budgetController.ledger.getEntries();
    assert.strictEqual(entries.length, 2);
    assert.strictEqual(entries[0].moduleName, 'A');
    assert.strictEqual(entries[1].moduleName, 'B');
  });

  it('ImpactEstimator computes coherent score', () => {
    const est = new ImpactEstimator();
    const r1 = est.estimateImpact('m', commitReq('a', 0));
    const r2 = est.estimateImpact('m', commitReq('b', 'overwrite'));
    assert.ok(r1.impactScore >= 0);
    assert.ok(r2.impactScore >= r1.impactScore);
    assert.strictEqual(r2.affectedKeys[0], 'b');
  });

  it('window reset after windowSizeMs', async () => {
    const v = new StabilityValidator({
      ...defaultConfig(),
      windowSizeMs: 50,
      maxGlobalImpactScorePerWindow: 3,
    });
    v.validateCommit('m', commitReq('a', 1));
    v.validateCommit('m', commitReq('b', 1));
    v.validateCommit('m', commitReq('c', 1));
    assert.ok(v.budgetController.ledger.getCumulativeImpact() >= 3);
    await new Promise((r) => setTimeout(r, 60));
    v.budgetController.ledger.resetWindowIfNeeded(Date.now());
    assert.strictEqual(v.budgetController.ledger.getCumulativeImpact(), 0);
  });
});

describe('StabilityValidator stress', () => {
  it('200 small commits exceed cumulative threshold', () => {
    const v = new StabilityValidator({
      maxGlobalImpactScorePerWindow: 50,
      maxSingleCommitImpact: 100,
      windowSizeMs: 60000,
      cooldownMs: 500,
    });
    for (let i = 0; i < 200; i++) {
      v.validateCommit('stress', commitReq(`k${i}`, 0));
    }
    const m = collectStabilityValidatorMetrics(v);
    assert.ok(m.rejectedCommits >= 1);
    assert.ok(m.cooldownActive === true || m.totalCommitsValidated >= 200);
    const ratio = m.totalCommitsValidated > 0 ? m.approvedCommits / m.totalCommitsValidated : 0;
    assert.ok(ratio >= 0 && ratio <= 1);
  });

  it('huge single commit is rejected immediately', () => {
    const v = new StabilityValidator({
      maxGlobalImpactScorePerWindow: 1000,
      maxSingleCommitImpact: 1,
      windowSizeMs: 60000,
      cooldownMs: 50,
    });
    const result = v.validateCommit('huge', commitReq('x', 'large overwrite'));
    assert.strictEqual(result.approved, false);
    assert.strictEqual(result.reason, 'single_commit_over_limit');
  });
});
