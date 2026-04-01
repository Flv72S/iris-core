/**
 * Feature Pipelines — C.7 (Demo-Oriented)
 * Trasformazioni dichiarative da UX State + Experience a Feature Output per la UI.
 */

export { FEATURE_TYPES, type FeatureType } from './FeatureType';
export type {
  FeatureOutput,
  FeatureVisibility,
  FeaturePriority,
} from './FeatureOutput';
export type { FeaturePipelineInput } from './FeaturePipelineInput';
export type { FeaturePipeline } from './FeaturePipeline';
export type { FeaturePipelinePolicyContext } from './FeaturePipelinePolicyContext';
export type { FeaturePipelinePreferenceContext } from './FeaturePipelinePreferenceContext';
export type { FeaturePipelinePreferenceOptions } from './FeaturePipelinePreferenceOptions';
export {
  FEATURE_PIPELINE_COMPONENT_ID,
  isFeaturePipelineEnabled,
  type FeaturePipelineRegistry,
} from './FeaturePipelineKillSwitch';
export { FeaturePipelineEngine } from './FeaturePipelineEngine';
export { createSmartInboxPipeline } from './pipelines/SmartInboxPipeline';
export { createFocusWellbeingPipeline } from './pipelines/FocusWellbeingPipeline';
