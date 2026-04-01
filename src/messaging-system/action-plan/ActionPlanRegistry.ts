/**
 * ActionPlanRegistry — C.2
 * Kill-switch per l'Action Plan Builder. OFF → plans [].
 */

export const ACTION_PLAN_COMPONENT_ID = 'messaging-system-action-plan';

export interface ActionPlanRegistry {
  isEnabled(componentId: string): boolean;
}

export function isActionPlanBuilderEnabled(registry: ActionPlanRegistry): boolean {
  return registry.isEnabled(ACTION_PLAN_COMPONENT_ID);
}
