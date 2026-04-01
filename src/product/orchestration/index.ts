/**
 * Orchestration — C.8 + C.9 light
 * Feature Orchestrator e Product Modes: coordinano presentazione, non decidono.
 */

export type { ProductMode } from './ProductMode';
export type {
  OrchestratedFeature,
  OrchestratedVisibility,
  OrchestratedPriority,
} from './OrchestratedFeature';
export type { FeatureOrchestrationInput } from './FeatureOrchestrationInput';
export type { FeatureOrchestrator } from './FeatureOrchestrator';
export {
  FEATURE_ORCHESTRATOR_COMPONENT_ID,
  isFeatureOrchestratorEnabled,
  type FeatureOrchestratorRegistry,
} from './FeatureOrchestratorKillSwitch';
export {
  DefaultFeatureOrchestrator,
  applyProductMode,
} from './DefaultFeatureOrchestrator';
