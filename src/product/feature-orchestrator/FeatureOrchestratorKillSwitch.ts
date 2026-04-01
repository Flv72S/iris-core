/**
 * FeatureOrchestratorKillSwitch — C.8
 * OFF → ritorna lista vuota.
 */

export const FEATURE_ORCHESTRATOR_COMPONENT_ID = 'feature-orchestrator';

export type FeatureOrchestratorRegistry = Record<string, boolean>;

export function isFeatureOrchestratorEnabled(
  registry: FeatureOrchestratorRegistry
): boolean {
  return registry[FEATURE_ORCHESTRATOR_COMPONENT_ID] === true;
}
