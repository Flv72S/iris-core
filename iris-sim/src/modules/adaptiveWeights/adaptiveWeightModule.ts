/**
 * Stability Step 5A — Adaptive weight module.
 * Runs adjustment cycle in sandbox via executeWithPipeline. No real global state write.
 */

import type { SandboxExecutionContext } from '../../stability/sandbox/executionContext.js';
import type { ControlledCommitPipeline } from '../../stability/pipeline/commitPipeline.js';
import type { PipelineResult } from '../../stability/pipeline/pipelineTypes.js';
import { createInitialWeightState, validateWeightBounds } from './weightState.js';
import type { WeightState } from './weightState.js';

function isWeightState(v: unknown): v is WeightState {
  if (v === null || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.weightA === 'number' &&
    typeof o.weightB === 'number' &&
    typeof o.weightC === 'number'
  );
}

export class AdaptiveWeightModule {
  constructor(
    private readonly sandboxContext: SandboxExecutionContext,
    private readonly commitPipeline: ControlledCommitPipeline,
    private readonly moduleName: string
  ) {}

  runAdjustmentCycle(inputSignal: number): PipelineResult {
    const { pipelineResult } = this.sandboxContext.executeWithPipeline(
      this.moduleName,
      () => {
        const snapshot = this.commitPipeline.stateAdapter.getSnapshot();
        const current: WeightState = isWeightState(snapshot['weights'])
          ? snapshot['weights']
          : createInitialWeightState();

        const delta = inputSignal * 0.05;
        const weightA = current.weightA + delta;
        const weightB = current.weightB - delta * 0.5;
        const weightC = current.weightC;

        if (
          !validateWeightBounds(weightA) ||
          !validateWeightBounds(weightB) ||
          !validateWeightBounds(weightC)
        ) {
          return;
        }

        const next: WeightState = Object.freeze({ weightA, weightB, weightC });
        this.sandboxContext.requestCommit('weights', next);
      },
      this.commitPipeline
    );

    return pipelineResult;
  }
}
