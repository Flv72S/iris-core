/**
 * Stability Step 5A — Controlled adaptive weight simulation.
 * No console.log; structured return only.
 */

import { SandboxController } from '../../stability/sandbox/sandboxController.js';
import { StabilityValidator } from '../../stability/validator/stabilityValidator.js';
import { GlobalStateAdapter } from '../../stability/pipeline/globalStateAdapter.js';
import { ControlledCommitPipeline } from '../../stability/pipeline/commitPipeline.js';
import { collectCommitPipelineMetrics } from '../../stability/pipeline/commitMetrics.js';
import { collectStabilityValidatorMetrics } from '../../stability/validator/stabilityMetrics.js';
import { AdaptiveWeightModule } from './adaptiveWeightModule.js';
import { createInitialWeightState } from './weightState.js';
import type { WeightState } from './weightState.js';
import type { CommitPipelineMetrics } from '../../stability/pipeline/commitMetrics.js';
import type { StabilityValidatorMetrics } from '../../stability/validator/stabilityMetrics.js';

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

export interface AdaptiveWeightSimulationResult {
  readonly appliedCount: number;
  readonly rejectedCount: number;
  readonly rejectionRatio: number;
  readonly finalState: Readonly<WeightState>;
  readonly pipelineMetrics: CommitPipelineMetrics;
  readonly validatorMetrics: StabilityValidatorMetrics;
}

export function runAdaptiveWeightSimulation(cycles: number): AdaptiveWeightSimulationResult {
  const sandboxController = new SandboxController();
  const validator = new StabilityValidator(STABILITY_BUDGET_CONFIG);
  const stateAdapter = new GlobalStateAdapter();
  const pipeline = new ControlledCommitPipeline(validator, stateAdapter);

  const sandboxContext = sandboxController.createSandbox('adaptiveWeights', SANDBOX_RESOURCE_CONFIG);
  const module = new AdaptiveWeightModule(sandboxContext, pipeline, 'adaptiveWeights');

  (stateAdapter.getState() as Record<string, unknown>)['weights'] = createInitialWeightState();

  let appliedCount = 0;
  let rejectedCount = 0;

  for (let i = 0; i < cycles; i++) {
    const inputSignal = Math.random() * 2 - 1;
    const result = module.runAdjustmentCycle(inputSignal);
    if (result.applied) appliedCount++;
    if (result.rejected) rejectedCount++;
  }

  const snapshot = stateAdapter.getSnapshot();
  const weights = snapshot['weights'];
  const finalState: WeightState =
    weights !== null && typeof weights === 'object' && 'weightA' in (weights as object)
      ? (weights as WeightState)
      : createInitialWeightState();

  const pipelineMetrics = collectCommitPipelineMetrics(pipeline);
  const validatorMetrics = collectStabilityValidatorMetrics(validator);

  const total = appliedCount + rejectedCount;
  const rejectionRatio = total > 0 ? rejectedCount / total : 0;

  return Object.freeze({
    appliedCount,
    rejectedCount,
    rejectionRatio,
    finalState: Object.freeze(finalState),
    pipelineMetrics,
    validatorMetrics,
  });
}
