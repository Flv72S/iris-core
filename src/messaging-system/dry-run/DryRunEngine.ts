/**
 * DryRunEngine - C.4.D
 * Accumula risultati da simulator. Kill-switch OFF -> results []. Output frozen.
 */

import type { ActionPlanSnapshot } from '../action-plan/ActionPlanSnapshot';
import type { ExecutionSemanticSnapshot } from '../execution-semantics/ExecutionSemanticSnapshot';
import type { ExecutionReadinessSnapshot } from '../execution-readiness/ExecutionReadinessSnapshot';
import type { MessagingCapabilityRegistry } from '../capabilities/MessagingCapabilityRegistry';
import type { DryRunSimulator } from './DryRunSimulator';
import type { DryRunResult } from './DryRunResult';
import type { DryRunSnapshot } from './DryRunSnapshot';
import type { DryRunRegistry } from './DryRunKillSwitch';
import { isDryRunEnabled } from './DryRunKillSwitch';

function toDerivedAtNumber(derivedAt: string | number): number {
  if (typeof derivedAt === 'number') return derivedAt;
  const t = new Date(derivedAt).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export class DryRunEngine {
  constructor(private readonly simulators: readonly DryRunSimulator[]) {}

  simulate(
    planSnapshot: ActionPlanSnapshot,
    semanticsSnapshot: ExecutionSemanticSnapshot,
    readinessSnapshot: ExecutionReadinessSnapshot,
    capabilityRegistry: MessagingCapabilityRegistry,
    registry: DryRunRegistry
  ): DryRunSnapshot {
    const derivedAt = toDerivedAtNumber(planSnapshot.derivedAt);
    if (!isDryRunEnabled(registry)) {
      return Object.freeze({
        results: Object.freeze([]),
        derivedAt,
      });
    }
    const results: DryRunResult[] = [];
    for (const sim of this.simulators) {
      const out = sim.simulate(
        planSnapshot,
        semanticsSnapshot,
        readinessSnapshot,
        capabilityRegistry
      );
      if (out != null && out.length > 0) {
        for (const r of out) {
          results.push(
            Object.freeze({
              planId: r.planId,
              simulatedSteps: Object.freeze(
                r.simulatedSteps.map((s) =>
                  Object.freeze({
                    stepId: s.stepId,
                    actionType: s.actionType,
                    description: s.description,
                    relatedPlanId: s.relatedPlanId,
                    warnings:
                      s.warnings != null ? Object.freeze([...s.warnings]) : undefined,
                    requiresConfirmation: s.requiresConfirmation,
                  })
                )
              ),
              blocked: r.blocked,
              reasons:
                r.reasons != null ? Object.freeze([...r.reasons]) : undefined,
            })
          );
        }
      }
    }
    return Object.freeze({
      results: Object.freeze(results),
      derivedAt,
    });
  }
}
