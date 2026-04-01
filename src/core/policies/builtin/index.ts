/**
 * Built-in feature activation policies. All are mandatory product-owned rules.
 */

export { WellbeingProtectionPolicy, WELLBEING_PROTECTION_POLICY_ID } from './WellbeingProtectionPolicy';
export { FocusModeRestrictionPolicy, FOCUS_MODE_RESTRICTION_POLICY_ID } from './FocusModeRestrictionPolicy';
export { OverloadPreventionPolicy, OVERLOAD_PREVENTION_POLICY_ID } from './OverloadPreventionPolicy';
export { FeatureSelfDisciplinePolicy, FEATURE_SELF_DISCIPLINE_POLICY_ID } from './FeatureSelfDisciplinePolicy';

import { WellbeingProtectionPolicy } from './WellbeingProtectionPolicy';
import { FocusModeRestrictionPolicy } from './FocusModeRestrictionPolicy';
import { OverloadPreventionPolicy } from './OverloadPreventionPolicy';
import { FeatureSelfDisciplinePolicy } from './FeatureSelfDisciplinePolicy';
import type { FeatureActivationPolicy } from '../FeatureActivationPolicy';

export const BUILTIN_POLICIES: readonly FeatureActivationPolicy[] = Object.freeze([
  WellbeingProtectionPolicy,
  FocusModeRestrictionPolicy,
  OverloadPreventionPolicy,
  FeatureSelfDisciplinePolicy,
]);
