/**
 * ExecutionEngine — C.4
 * Esecuzione reale, minimale e sicura. Solo piani READY, solo adapter dichiarati. Nessuna decisione, nessun retry.
 */

import type { ExecutableActionPlanSnapshot } from './ExecutableActionPlanSnapshot';
import type { ExecutionResult } from './ExecutionResult';
import type { ExecutionAdapterRegistry } from './ExecutionAdapterRegistry';
import type { ExecutionRegistry } from './ExecutionKillSwitch';
import { isExecutionEnabled } from './ExecutionKillSwitch';
import type { ExecutionStepResult } from '../execution-boundary/ExecutionStepResult';

function createSkippedResult(planId: string): ExecutionResult {
  const executedAt = new Date().toISOString();
  return Object.freeze({
    executionId: `exec-${planId}-${Date.now()}`,
    planId,
    status: 'SKIPPED',
    steps: Object.freeze([]),
    executedAt,
  });
}

function createStepResultNoAdapter(stepId: string): ExecutionStepResult {
  return Object.freeze({
    stepId,
    status: 'failure',
    errorMessage: 'no adapter',
  });
}

export class ExecutionEngine {
  constructor(private readonly adapterRegistry: ExecutionAdapterRegistry) {}

  async execute(
    plan: ExecutableActionPlanSnapshot,
    registry: ExecutionRegistry
  ): Promise<ExecutionResult> {
    if (!isExecutionEnabled(registry)) {
      return createSkippedResult(plan.plan.planId);
    }
    if (plan.readinessStatus !== 'READY') {
      throw new Error('ExecutionReadiness must be READY');
    }
    const planId = plan.plan.planId;
    const steps: ExecutionStepResult[] = [];
    const orderedSteps = plan.plan.steps;

    for (const step of orderedSteps) {
      const adapter = this.adapterRegistry.findAdapterForStep(step);
      if (adapter == null) {
        steps.push(createStepResultNoAdapter(step.stepId));
        continue;
      }
      const stepResult = await adapter.executeStep(step);
      steps.push(
        Object.freeze({
          stepId: stepResult.stepId,
          status: stepResult.status,
          errorCode: stepResult.errorCode,
          errorMessage: stepResult.errorMessage,
        })
      );
    }

    const hasFailure = steps.some((s) => s.status === 'failure');
    const status = hasFailure ? 'FAILED' : 'SUCCESS';
    const executedAt = new Date().toISOString();

    return Object.freeze({
      executionId: `exec-${planId}-${Date.now()}`,
      planId,
      status,
      steps: Object.freeze(steps),
      executedAt,
    });
  }
}
