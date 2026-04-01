import type { DerivedUxState } from './derived-ux-state/DerivedUxState';
import type { DerivedExperienceCandidate } from './derived-experience/DerivedExperienceCandidate';
import type { FeatureEligibility } from './feature-eligibility/FeatureEligibility';

export interface DerivedStateSnapshot {
  readonly uxStates: readonly DerivedUxState[];
  readonly experienceCandidates: readonly DerivedExperienceCandidate[];
  readonly featureEligibility: readonly FeatureEligibility[];
  readonly derivedAt: number;
}
