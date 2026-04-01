/**
 * FeaturePipelineKillSwitch — C.7 (Demo-Oriented)
 * OFF → output vuoto.
 */

export const FEATURE_PIPELINE_COMPONENT_ID = 'feature-pipelines';

export type FeaturePipelineRegistry = Record<string, boolean>;

export function isFeaturePipelineEnabled(
  registry: FeaturePipelineRegistry
): boolean {
  return registry[FEATURE_PIPELINE_COMPONENT_ID] === true;
}
