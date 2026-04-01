/**
 * IrisCapabilityRegistry — C.1.5
 * Registry per enable/disable del Capability Model. Pattern kill-switch.
 */

export const IRIS_CAPABILITY_COMPONENT_ID = 'messaging-system-capability';

export interface IrisCapabilityRegistry {
  isEnabled(componentId: string): boolean;
}

export function isCapabilityModelEnabled(registry: IrisCapabilityRegistry): boolean {
  return registry.isEnabled(IRIS_CAPABILITY_COMPONENT_ID);
}
