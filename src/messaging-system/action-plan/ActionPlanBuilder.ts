/**
 * ActionPlanBuilder — C.2
 * Costruisce Action Plan da Contract + Capability + Semantics. Deterministico, side-effect free.
 * Mapping 1:N (un contract → più step). Steps solo se capability e semantic esistono.
 */

import type { MessagingContractSnapshot } from '../contract/MessagingContractSnapshot';
import type { IrisCapabilitySnapshot } from '../capabilities/IrisCapabilitySnapshot';
import type { IrisCapabilitySemanticSnapshot } from '../capabilities/semantics/IrisCapabilitySemanticSnapshot';
import type { ActionPlan } from './ActionPlan';
import type { ActionPlanSnapshot } from './ActionPlanSnapshot';
import type { ActionPlanStep } from './ActionPlanStep';
import type { ActionPlanRegistry } from './ActionPlanRegistry';
import { isActionPlanBuilderEnabled } from './ActionPlanRegistry';

export class ActionPlanBuilder {
  /**
   * Build Action Plan snapshot. Registry OFF → plans [].
   * Steps creati solo se capability esiste e semantic associata esiste.
   */
  build(
    contractSnapshot: MessagingContractSnapshot,
    capabilitySnapshot: IrisCapabilitySnapshot,
    semanticSnapshot: IrisCapabilitySemanticSnapshot,
    registry: ActionPlanRegistry
  ): ActionPlanSnapshot {
    const derivedAt = contractSnapshot.derivedAt;
    if (!isActionPlanBuilderEnabled(registry)) {
      return Object.freeze({
        plans: Object.freeze([]),
        derivedAt,
      });
    }
    const capabilityTypes = new Set(capabilitySnapshot.capabilities.map((c) => c.capabilityType));
    const semanticsByType = semanticSnapshot.semantics.filter((s) => capabilityTypes.has(s.capabilityType));

    const plans: ActionPlan[] = [];
    for (const contract of contractSnapshot.contracts) {
      const steps: ActionPlanStep[] = [];
      let stepIndex = 0;
      for (const semantic of semanticsByType) {
        steps.push(
          Object.freeze({
            stepId: `step-${contract.contractId}-${stepIndex}`,
            capabilityType: semantic.capabilityType,
            semanticId: semantic.semanticId,
            inputs: Object.freeze([...semantic.inputs]),
            outputs: Object.freeze([...semantic.outputs]),
            effects: Object.freeze([...semantic.effects]),
            dependencies: Object.freeze([]),
          })
        );
        stepIndex += 1;
      }
      const expectedEffects = steps.length > 0
        ? Object.freeze([...new Set(steps.flatMap((s) => s.effects))])
        : Object.freeze([]);
      plans.push(
        Object.freeze({
          planId: `plan-${contract.contractId}`,
          intentId: contract.intentId,
          contractIds: Object.freeze([contract.contractId]),
          steps: Object.freeze(steps),
          expectedEffects,
          derivedAt: contract.derivedAt,
        })
      );
    }
    return Object.freeze({
      plans: Object.freeze(plans),
      derivedAt,
    });
  }
}
