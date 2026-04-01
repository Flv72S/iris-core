/**
 * Stability Layer — Non-invasive registry for adaptive modules.
 * Hook for future integration; no modification of existing modules.
 */

import type { AdaptiveModuleRegistration } from './stabilityTypes.js';

const registry: AdaptiveModuleRegistration[] = [];

/**
 * Register an adaptive module for stability control. Does not activate control;
 * prepares for progressive integration.
 */
export function registerAdaptiveModule(registration: AdaptiveModuleRegistration): void {
  registry.push(registration);
}

export function getRegisteredModules(): readonly AdaptiveModuleRegistration[] {
  return registry;
}

export function clearRegistry(): void {
  registry.length = 0;
}
