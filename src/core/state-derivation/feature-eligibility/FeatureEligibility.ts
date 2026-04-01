/**
 * FeatureEligibility — Idoneità feature derivata da stati. Non attivazione, non priorità.
 */

import type { FeatureId, UxStateType } from './types';

export interface FeatureEligibility {
  readonly featureId: FeatureId;
  readonly eligible: boolean;
  readonly reason: string;
  readonly derivedFromStates: readonly UxStateType[];
}
