/**
 * IrisCapabilitySemanticRegistry — C.1.6
 * Kill-switch per il Semantics Layer. OFF → nessuna semantics esposta.
 */

export const IRIS_CAPABILITY_SEMANTIC_COMPONENT_ID = 'messaging-system-capability-semantics';

export interface IrisCapabilitySemanticRegistry {
  isEnabled(componentId: string): boolean;
}

export function isCapabilitySemanticEnabled(registry: IrisCapabilitySemanticRegistry): boolean {
  return registry.isEnabled(IRIS_CAPABILITY_SEMANTIC_COMPONENT_ID);
}
