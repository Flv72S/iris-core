/**
 * FeatureOrchestrator — C.8
 * Coordina output feature in vista UX coerente. Non decide, non modifica payload.
 */

import type { FeatureOrchestratorInput } from './FeatureOrchestratorInput';
import type { OrchestratedFeature } from './OrchestratedFeature';

export interface FeatureOrchestrator {
  orchestrate(input: FeatureOrchestratorInput): readonly OrchestratedFeature<unknown>[];
}
