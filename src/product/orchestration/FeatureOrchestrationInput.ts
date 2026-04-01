/**
 * FeatureOrchestrationInput — C.8 + C.9 light
 * Input: feature già calcolate + experience + mode.
 */

import type { FeatureOutput } from '../feature-pipelines/FeatureOutput';
import type { UxExperienceState } from '../ux-experience/UxExperienceState';
import type { ProductMode } from './ProductMode';

export interface FeatureOrchestrationInput {
  readonly features: readonly FeatureOutput[];
  readonly experience: UxExperienceState;
  readonly mode: ProductMode;
  readonly now: number;
}
