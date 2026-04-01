/**
 * FeatureOrchestratorInput — C.8
 * Input per orchestrazione: experience + output delle pipeline.
 */

import type { UxExperienceState } from '../ux-experience/UxExperienceState';

export interface FeatureOutputEntry {
  readonly featureId: string;
  readonly output: unknown;
}

export interface FeatureOrchestratorInput {
  readonly experience: UxExperienceState;
  readonly featureOutputs: readonly FeatureOutputEntry[];
  readonly now: number;
}
