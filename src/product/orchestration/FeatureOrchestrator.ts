/**
 * FeatureOrchestrator — C.8 + C.9 light
 * Aggregatore dichiarativo: applica regole di visibilità, non decide, non modifica stati.
 */

import type { FeatureOrchestrationInput } from './FeatureOrchestrationInput';
import type { OrchestratedFeature } from './OrchestratedFeature';

export interface FeatureOrchestrator {
  orchestrate(input: FeatureOrchestrationInput): readonly OrchestratedFeature[];
}
