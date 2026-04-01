/**
 * FeatureOrchestratorKillSwitch — C.8 + C.9 light
 * OFF → output vuoto.
 */

export const FEATURE_ORCHESTRATOR_COMPONENT_ID = 'feature-orchestrator';

export type FeatureOrchestratorRegistry = Record<string, boolean>;

export function isFeatureOrchestratorEnabled(
  registry: FeatureOrchestratorRegistry
): boolean {
  return registry[FEATURE_ORCHESTRATOR_COMPONENT_ID] === true;
}
