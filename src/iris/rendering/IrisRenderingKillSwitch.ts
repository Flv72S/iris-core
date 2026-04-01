/**
 * IrisRenderingKillSwitch — IRIS 9.3
 * Kill-switch locale al layer Rendering. Se OFF, render() restituisce [].
 * Nessun effetto su interpretation, orchestration, messaging.
 */

export const IRIS_RENDERING_COMPONENT_ID = 'iris-rendering';

export interface RenderingRegistry {
  isEnabled(componentId: string): boolean;
}

export function isRenderingEnabled(registry: RenderingRegistry): boolean {
  return registry.isEnabled(IRIS_RENDERING_COMPONENT_ID);
}
