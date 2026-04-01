/**
 * IrisDecisionKillSwitch — IRIS 11.0
 * Kill-switch per il Decision Plane. Registry read-only; nessun effetto su altri layer.
 */

export const IRIS_DECISION_COMPONENT_ID = 'iris-decision';

export interface DecisionRegistry {
  isEnabled(componentId: string): boolean;
}

export function isDecisionEnabled(registry: DecisionRegistry): boolean {
  return registry.isEnabled(IRIS_DECISION_COMPONENT_ID);
}
