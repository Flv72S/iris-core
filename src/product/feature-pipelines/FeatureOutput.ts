/**
 * FeatureOutput — C.7 (Demo-Oriented)
 * Output di una feature per la UI. MUST NOT: action, command, execute, recommendation, score, automation, learning, sideEffect.
 */

import type { FeatureType } from './FeatureType';

export type FeatureVisibility = 'visible' | 'reduced' | 'hidden';
export type FeaturePriority = 'low' | 'normal' | 'high';

export interface FeatureOutput {
  readonly featureId: string;
  readonly featureType: FeatureType;
  readonly title: string;
  readonly description?: string;
  readonly visibility: FeatureVisibility;
  readonly priority: FeaturePriority;
  readonly explanation: string;
  readonly derivedAt: number;
}
