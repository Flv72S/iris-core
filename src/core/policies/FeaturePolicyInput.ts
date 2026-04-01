/**
 * FeaturePolicyInput — Input ammessi: stato derivato, experience, product mode, now.
 * Vietati: segnali raw, feedback execution, metriche cumulative, UX events.
 */

import type { DerivedStateSnapshot } from '../state-derivation/DerivedStateSnapshot';
import type { UxExperienceState } from '../../product/ux-experience/UxExperienceState';
import type { ProductMode } from '../../product/orchestration/ProductMode';

/** Optional: used by policies that need feature priority (e.g. OverloadPrevention). */
export type FeaturePriorityForPolicy = 'low' | 'normal' | 'high';

export interface FeaturePolicyInput {
  readonly featureId: string;
  readonly derivedState: DerivedStateSnapshot;
  readonly uxExperience: UxExperienceState;
  readonly productMode: ProductMode;
  readonly now: number;
  /** Set when evaluating from pipeline output so OverloadPreventionPolicy can apply. */
  readonly featurePriority?: FeaturePriorityForPolicy;
}
