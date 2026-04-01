/**
 * IrisActionBridgeKillSwitch — IRIS 12.0
 * Kill-switch per l'Action Bridge. Registry read-only; nessun effetto su altri layer.
 */

export const IRIS_ACTION_BRIDGE_COMPONENT_ID = 'iris-action-bridge';

export interface ActionBridgeRegistry {
  isEnabled(componentId: string): boolean;
}

export function isActionBridgeEnabled(registry: ActionBridgeRegistry): boolean {
  return registry.isEnabled(IRIS_ACTION_BRIDGE_COMPONENT_ID);
}
