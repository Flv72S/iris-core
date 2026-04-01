/**
 * OrchestratedFeature — C.8 + C.9 light
 * Feature con appliedMode. MUST NOT: action, command, recommendation, score, automation, learning, feedback.
 */

import type { FeatureType } from '../feature-pipelines/FeatureType';
import type { ProductMode } from './ProductMode';

export type OrchestratedVisibility = 'visible' | 'reduced' | 'hidden';
export type OrchestratedPriority = 'low' | 'normal' | 'high';

export interface OrchestratedFeature {
  readonly featureId: string;
  readonly featureType: FeatureType;
  readonly title: string;
  readonly description?: string;
  readonly visibility: OrchestratedVisibility;
  readonly priority: OrchestratedPriority;
  readonly explanation: string;
  readonly appliedMode: ProductMode;
  readonly derivedAt: number;
}
