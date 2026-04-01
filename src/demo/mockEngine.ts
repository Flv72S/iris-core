/**
 * Mock Engine — Collante demo.
 * Riceve scenario + mode, invoca Pipeline Engine e Orchestrator. Nessuna logica UI, nessuna simulazione IRIS.
 */

import type { DemoScenario } from './scenarios';
import type { UxStateSnapshot } from '../messaging-system/ux-state/UxStateSnapshot';
import type { UxExperienceState } from '../product/ux-experience/UxExperienceState';
import type { OrchestratedFeature } from '../product/orchestration/OrchestratedFeature';
import type { ProductMode } from '../product/orchestration/ProductMode';
import { FeaturePipelineEngine } from '../product/feature-pipelines/FeaturePipelineEngine';
import { createSmartInboxPipeline, createFocusWellbeingPipeline } from '../product/feature-pipelines';
import { DefaultFeatureOrchestrator } from '../product/orchestration/DefaultFeatureOrchestrator';
import { FEATURE_PIPELINE_COMPONENT_ID } from '../product/feature-pipelines/FeaturePipelineKillSwitch';
import { FEATURE_ORCHESTRATOR_COMPONENT_ID } from '../product/orchestration/FeatureOrchestratorKillSwitch';

export interface DemoOutput {
  readonly uxState: UxStateSnapshot;
  readonly experience: UxExperienceState;
  readonly features: readonly OrchestratedFeature[];
}

const pipelineRegistry = Object.freeze({
  [FEATURE_PIPELINE_COMPONENT_ID]: true,
});
const orchestratorRegistry = Object.freeze({
  [FEATURE_ORCHESTRATOR_COMPONENT_ID]: true,
});

const pipelineEngine = new FeaturePipelineEngine([
  createSmartInboxPipeline(),
  createFocusWellbeingPipeline(),
]);
const orchestrator = new DefaultFeatureOrchestrator(orchestratorRegistry);

/**
 * Sincrono, deterministico. Nessuna API, nessun side-effect.
 */
export function runDemo(scenario: DemoScenario, mode: ProductMode): DemoOutput {
  const now = scenario.uxState.derivedAt;
  const pipelineInput = Object.freeze({
    uxState: scenario.uxState,
    experience: scenario.experience,
    now,
  });
  const featureOutputs = pipelineEngine.run(pipelineInput, pipelineRegistry);
  const orchestrationInput = Object.freeze({
    features: featureOutputs,
    experience: scenario.experience,
    mode,
    now,
  });
  const features = orchestrator.orchestrate(orchestrationInput);
  return Object.freeze({
    uxState: scenario.uxState,
    experience: scenario.experience,
    features,
  });
}
