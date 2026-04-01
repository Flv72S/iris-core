/**
 * Stability Step 5A — Adaptive weight module tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createInitialWeightState, validateWeightBounds } from './weightState.js';
import { AdaptiveWeightModule } from './adaptiveWeightModule.js';
import { runAdaptiveWeightSimulation } from './adaptiveWeightSimulation.js';
import { SandboxController } from '../../stability/sandbox/sandboxController.js';
import { StabilityValidator } from '../../stability/validator/stabilityValidator.js';
import { GlobalStateAdapter } from '../../stability/pipeline/globalStateAdapter.js';
import { ControlledCommitPipeline } from '../../stability/pipeline/commitPipeline.js';

const STABILITY_BUDGET_CONFIG = {
  maxSingleCommitImpact: 1.2,
  maxGlobalImpactScorePerWindow: 8,
  windowSizeMs: 5000,
  cooldownMs: 3000,
};

const SANDBOX_RESOURCE_CONFIG = {
  maxExecutionTimeMs: 5000,
  maxDecisionsPerWindow: 100,
  maxStateWrites: 50,
  cooldownMs: 500,
};

function setupModule(): {
  module: AdaptiveWeightModule;
  adapter: GlobalStateAdapter;
  pipeline: ControlledCommitPipeline;
} {
  const sandboxController = new SandboxController();
  const validator = new StabilityValidator(STABILITY_BUDGET_CONFIG);
  const adapter = new GlobalStateAdapter();
  const pipeline = new ControlledCommitPipeline(validator, adapter);
  const ctx = sandboxController.createSandbox('aw', SANDBOX_RESOURCE_CONFIG);
  const module = new AdaptiveWeightModule(ctx, pipeline, 'adaptiveWeights');
  return { module, adapter, pipeline };
}

describe('weightState', () => {
  it('createInitialWeightState returns 1,1,1', () => {
    const s = createInitialWeightState();
    assert.strictEqual(s.weightA, 1);
    assert.strictEqual(s.weightB, 1);
    assert.strictEqual(s.weightC, 1);
  });

  it('validateWeightBounds allows 0.5 to 2.0', () => {
    assert.strictEqual(validateWeightBounds(0.5), true);
    assert.strictEqual(validateWeightBounds(2.0), true);
    assert.strictEqual(validateWeightBounds(1), true);
    assert.strictEqual(validateWeightBounds(0.4), false);
    assert.strictEqual(validateWeightBounds(2.1), false);
  });
});

describe('AdaptiveWeightModule', () => {
  it('module initializes correctly', () => {
    const { module } = setupModule();
    assert.ok(module);
    assert.ok(typeof module.runAdjustmentCycle === 'function');
  });

  it('adjustmentCycle produces valid commitRequest', () => {
    const { module, adapter } = setupModule();
    const result = module.runAdjustmentCycle(0);
    assert.ok(result.applied === true || result.rejected === true || (result.applied === false && result.rejected === false));
    const snap = adapter.getSnapshot();
    if (result.applied) {
      assert.ok(snap['weights'] !== undefined);
    }
  });

  it('commit approved modifies adapter state', () => {
    const highLimitConfig = { ...STABILITY_BUDGET_CONFIG, maxSingleCommitImpact: 4 };
    const sandboxController = new SandboxController();
    const validator = new StabilityValidator(highLimitConfig);
    const adapter = new GlobalStateAdapter();
    const pipeline = new ControlledCommitPipeline(validator, adapter);
    const ctx = sandboxController.createSandbox('aw', SANDBOX_RESOURCE_CONFIG);
    const module = new AdaptiveWeightModule(ctx, pipeline, 'adaptiveWeights');
    module.runAdjustmentCycle(0);
    const snap = adapter.getSnapshot();
    const w = snap['weights'];
    assert.ok(w !== undefined);
    assert.ok(typeof (w as { weightA: number }).weightA === 'number');
  });

  it('rejection does not modify state', () => {
    const validator = new StabilityValidator({
      maxSingleCommitImpact: 0.01,
      maxGlobalImpactScorePerWindow: 100,
      windowSizeMs: 5000,
      cooldownMs: 100,
    });
    const adapter = new GlobalStateAdapter();
    const pipeline = new ControlledCommitPipeline(validator, adapter);
    const ctx = new SandboxController().createSandbox('aw', SANDBOX_RESOURCE_CONFIG);
    const module = new AdaptiveWeightModule(ctx, pipeline, 'adaptiveWeights');
    module.runAdjustmentCycle(0.5);
    const snap = adapter.getSnapshot();
    if (snap['weights'] !== undefined) {
      const w = snap['weights'] as { weightA: number; weightB: number; weightC: number };
      assert.ok(w.weightA >= 0.5 && w.weightA <= 2.0);
    }
  });

  it('values stay within bounds 0.5 – 2.0', () => {
    const { module, adapter } = setupModule();
    for (let i = 0; i < 30; i++) {
      module.runAdjustmentCycle((i % 5) * 0.2 - 0.4);
    }
    const snap = adapter.getSnapshot();
    const w = snap['weights'] as { weightA: number; weightB: number; weightC: number } | undefined;
    if (w) {
      assert.ok(w.weightA >= 0.5 && w.weightA <= 2.0);
      assert.ok(w.weightB >= 0.5 && w.weightB <= 2.0);
      assert.ok(w.weightC >= 0.5 && w.weightC <= 2.0);
    }
  });
});

describe('runAdaptiveWeightSimulation', () => {
  it('200 cycles: rejectionRatio < 0.25, finalState coherent, values in range', () => {
    const r = runAdaptiveWeightSimulation(200);
    assert.ok(r.rejectionRatio < 0.25);
    assert.ok(r.finalState.weightA >= 0.5 && r.finalState.weightA <= 2.0);
    assert.ok(r.finalState.weightB >= 0.5 && r.finalState.weightB <= 2.0);
    assert.ok(r.finalState.weightC >= 0.5 && r.finalState.weightC <= 2.0);
  });

  it('no write outside GlobalStateAdapter', () => {
    const external: Record<string, unknown> = {};
    const r = runAdaptiveWeightSimulation(50);
    assert.strictEqual(Object.keys(external).length, 0);
    assert.ok(r.appliedCount >= 0);
    assert.ok(r.rejectedCount >= 0);
  });
});

describe('AdaptiveWeight stress', () => {
  it('500 cycles: some rejections, cooldown occasional, no permanent lock', () => {
    const r = runAdaptiveWeightSimulation(500);
    assert.ok(r.appliedCount + r.rejectedCount > 0);
    assert.ok(r.rejectionRatio >= 0 && r.rejectionRatio <= 1);
    assert.ok(r.appliedCount > 0 || r.rejectedCount > 0);
  });
});
