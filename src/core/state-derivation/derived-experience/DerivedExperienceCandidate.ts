/**
 * DerivedExperienceCandidate — Candidato esperienza derivato. Più candidate possono coesistere.
 */

import type { ExperienceLabel, UxStateType } from './types';

export interface DerivedExperienceCandidate {
  readonly label: ExperienceLabel;
  readonly confidence: number;
  readonly supportingStates: readonly UxStateType[];
}
