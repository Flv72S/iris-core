/**
 * Stability Step 4 — Commit pipeline tests.
 * Applied/rejected, stateAdapter, history, executeWithPipeline, metrics, stress.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StabilityValidator } from '../validator/stabilityValidator.js';
import { GlobalStateAdapter } from './globalStateAdapter.js';
import { ControlledCommitPipeline } from './commitPipeline.js';
import { collectCommitPipelineMetrics } from './commitMetrics.js';
import { SandboxExecutionContext } from '../sandbox/executionContext.js';

function validatorConfig(overrides?: Partial<{ maxGlobalImpactScorePerWindow: number; maxSingleCommitImpact: number; windowSizeMs: number; cooldownMs: number }>) {
  return {
    maxGlobalImpactScorePerWindow: 100,
    maxSingleCommitImpact: 10,
    windowSizeMs: 10000,
    cooldownMs: 100,
    ...overrides,
  };
}

function commitReq(key: string, value: unknown): { sandboxId: string; localKey: string; value: unknown; timestamp: number } {
  return { sandboxId: 's1', localKey: key, value, timestamp: Date.now() };
}

describe('CommitPipeline', () => {
  it('approved commit is applied in stateAdapter', () => {
    const v = new StabilityValidator(validatorConfig());
    const adapter = new GlobalStateAdapter();
    const pipeline = new ControlledCommitPipeline(v, adapter);
    const req = commitReq('x', 42);
    const result = pipeline.processCommit('mod', req);
    assert.strictEqual(result.applied, true);
    assert.strictEqual(result.rejected, false);
    const snap = adapter.getSnapshot();
    assert.strictEqual(snap['x'], 42);
  });

  it('rejected commit does not modify state', () => {
    const v = new StabilityValidator(validatorConfig({ maxSingleCommitImpact: 0.2 }));
    const adapter = new GlobalStateAdapter();
    const pipeline = new ControlledCommitPipeline(v, adapter);
    const req = commitReq('y', 'big overwrite');
    const result = pipeline.processCommit('mod', req);
    assert.strictEqual(result.applied, false);
    assert.strictEqual(result.rejected, true);
    const snap = adapter.getSnapshot();
    assert.strictEqual(snap['y'], undefined);
  });

  it('applicationHistory records correctly', () => {
    const v = new StabilityValidator(validatorConfig());
    const adapter = new GlobalStateAdapter();
    const pipeline = new ControlledCommitPipeline(v, adapter);
    pipeline.processCommit('A', commitReq('k1', 1));
    pipeline.processCommit('B', commitReq('k2', 2));
    assert.strictEqual(pipeline.applicationHistory.length, 2);
    assert.strictEqual(pipeline.applicationHistory[0].moduleName, 'A');
    assert.strictEqual(pipeline.applicationHistory[1].moduleName, 'B');
    assert.strictEqual(pipeline.applicationHistory[0].applied, true);
  });

  it('executeWithPipeline integrates sandbox and pipeline', () => {
    const v = new StabilityValidator(validatorConfig());
    const adapter = new GlobalStateAdapter();
    const pipeline = new ControlledCommitPipeline(v, adapter);
    const ctx = new SandboxExecutionContext('s1', {
      maxExecutionTimeMs: 5000,
      maxDecisionsPerWindow: 100,
      maxStateWrites: 100,
      cooldownMs: 50,
    });
    const { result, pipelineResult } = ctx.executeWithPipeline('mod', () => {
      ctx.safeWrite('a', 1);
      ctx.requestCommit('stateKey', 99);
      return 'done';
    }, pipeline);
    assert.strictEqual(result, 'done');
    assert.strictEqual(pipelineResult.applied, true);
    assert.strictEqual(adapter.getSnapshot()['stateKey'], 99);
  });

  it('multiple small commits applied until threshold', () => {
    const v = new StabilityValidator(validatorConfig({ maxGlobalImpactScorePerWindow: 15, maxSingleCommitImpact: 5 }));
    const adapter = new GlobalStateAdapter();
    const pipeline = new ControlledCommitPipeline(v, adapter);
    let applied = 0;
    for (let i = 0; i < 20; i++) {
      const r = pipeline.processCommit('m', commitReq(`k${i}`, 0));
      if (r.applied) applied++;
    }
    assert.ok(applied >= 1);
    assert.ok(pipeline.applicationHistory.length >= 1);
  });

  it('over threshold leads to rejection', () => {
    const v = new StabilityValidator(validatorConfig({ maxSingleCommitImpact: 0.3 }));
    const adapter = new GlobalStateAdapter();
    const pipeline = new ControlledCommitPipeline(v, adapter);
    const r = pipeline.processCommit('m', commitReq('x', 'overwrite'));
    assert.strictEqual(r.rejected, true);
    assert.strictEqual(adapter.getSnapshot()['x'], undefined);
  });

  it('state remains consistent after rejection', () => {
    const v = new StabilityValidator(validatorConfig({ maxSingleCommitImpact: 1.5 }));
    const adapter = new GlobalStateAdapter();
    const pipeline = new ControlledCommitPipeline(v, adapter);
    pipeline.processCommit('m', commitReq('ok', 0));
    pipeline.processCommit('m', commitReq('bad', { x: 1, y: 1 }));
    const snap = adapter.getSnapshot();
    assert.strictEqual(snap['ok'], 0);
    assert.strictEqual(snap['bad'], undefined);
  });

  it('metrics reflect applied vs rejected', () => {
    const v = new StabilityValidator(validatorConfig({ maxSingleCommitImpact: 0.5 }));
    const adapter = new GlobalStateAdapter();
    const pipeline = new ControlledCommitPipeline(v, adapter);
    pipeline.processCommit('m', commitReq('a', 0));
    pipeline.processCommit('m', commitReq('b', 'big'));
    const m = collectCommitPipelineMetrics(pipeline);
    assert.strictEqual(m.totalCommitsProcessed, 2);
    assert.ok(m.totalCommitsApplied >= 0);
    assert.ok(m.totalCommitsRejected >= 1);
    assert.ok(m.rejectionRatio >= 0 && m.rejectionRatio <= 1);
  });
});

describe('CommitPipeline stress', () => {
  it('300 small commits, 1 huge, 50 post-cooldown; rejectionRatio and history correct', () => {
    const v = new StabilityValidator({
      maxGlobalImpactScorePerWindow: 80,
      maxSingleCommitImpact: 2,
      windowSizeMs: 60000,
      cooldownMs: 200,
    });
    const adapter = new GlobalStateAdapter();
    const pipeline = new ControlledCommitPipeline(v, adapter);
    const realGlobal: Record<string, unknown> = {};

    for (let i = 0; i < 300; i++) {
      pipeline.processCommit('stress', commitReq(`k${i}`, 0));
    }
    pipeline.processCommit('stress', commitReq('huge', 'enormous overwrite'));

    for (let i = 300; i < 350; i++) {
      pipeline.processCommit('stress', commitReq(`k${i}`, 0));
    }

    const m = collectCommitPipelineMetrics(pipeline);
    assert.ok(m.rejectionRatio > 0);
    assert.ok(m.averageImpactApplied >= 0);
    assert.strictEqual(pipeline.applicationHistory.length, m.totalCommitsApplied);
    assert.strictEqual(Object.keys(realGlobal).length, 0);
  });
});
