/**
 * ExecutionReadinessEngine - C.4.C
 * Accumula verdict da evaluator. Kill-switch OFF -> verdicts []. Output frozen.
 */

import type { ActionPlanSnapshot } from '../action-plan/ActionPlanSnapshot';
import type { ExecutionSemanticSnapshot } from '../execution-semantics/ExecutionSemanticSnapshot';
import type { MessagingCapabilityRegistry } from '../capabilities/MessagingCapabilityRegistry';
import type { ExecutionReadinessEvaluator } from './ExecutionReadinessEvaluator';
import type { ExecutionReadinessVerdict } from './ExecutionReadinessVerdict';
import type { ExecutionReadinessSnapshot } from './ExecutionReadinessSnapshot';
import type { ExecutionReadinessRegistry } from './ExecutionReadinessKillSwitch';
import { isExecutionReadinessEnabled } from './ExecutionReadinessKillSwitch';

export class ExecutionReadinessEngine {
  constructor(private readonly evaluators: readonly ExecutionReadinessEvaluator[]) {}

  evaluate(
    planSnapshot: ActionPlanSnapshot,
    semanticsSnapshot: ExecutionSemanticSnapshot,
    capabilityRegistry: MessagingCapabilityRegistry,
    registry: ExecutionReadinessRegistry
  ): ExecutionReadinessSnapshot {
    const derivedAt = planSnapshot.derivedAt;
    if (!isExecutionReadinessEnabled(registry)) {
      return Object.freeze({
        verdicts: Object.freeze([]),
        derivedAt,
      });
    }
    const verdicts: ExecutionReadinessVerdict[] = [];
    for (const evaluator of this.evaluators) {
      const out = evaluator.evaluate(planSnapshot, semanticsSnapshot, capabilityRegistry);
      if (out != null && out.length > 0) {
        for (const v of out) {
          verdicts.push(
            Object.freeze({
              planId: v.planId,
              status: v.status,
              reasons: Object.freeze([...v.reasons]),
              safetyFlags: v.safetyFlags != null ? Object.freeze([...v.safetyFlags]) : undefined,
              derivedAt: v.derivedAt,
            })
          );
        }
      }
    }
    return Object.freeze({
      verdicts: Object.freeze(verdicts),
      derivedAt,
    });
  }
}
