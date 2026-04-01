/**
 * Feature Orchestrator — C.8
 * Composizione dichiarativa di output feature in vista UX coerente.
 */

export type { OrchestratedFeature, FeatureVisibility } from './OrchestratedFeature';
export type { FeatureOrchestratorInput, FeatureOutputEntry } from './FeatureOrchestratorInput';
export type { FeatureOrchestrator } from './FeatureOrchestrator';
export {
  FEATURE_ORCHESTRATOR_COMPONENT_ID,
  isFeatureOrchestratorEnabled,
  type FeatureOrchestratorRegistry,
} from './FeatureOrchestratorKillSwitch';
export {
  DefaultFeatureOrchestrator,
  orchestrateFeatures,
} from './DefaultFeatureOrchestrator';
