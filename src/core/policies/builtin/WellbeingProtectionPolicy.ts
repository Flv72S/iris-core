/**
 * WellbeingProtectionPolicy — Se uxExperience.label === 'BLOCKED', tutte le feature operative sono bloccate.
 * Product-owned, deterministic. Does not execute.
 */

import type { FeatureActivationPolicy } from '../FeatureActivationPolicy';
import type { FeaturePolicyInput } from '../FeaturePolicyInput';
import type { FeaturePolicyDecision } from '../FeaturePolicyDecision';

export const WELLBEING_PROTECTION_POLICY_ID = 'wellbeing-protection';

export const WellbeingProtectionPolicy: FeatureActivationPolicy = Object.freeze({
  id: WELLBEING_PROTECTION_POLICY_ID,
  evaluate(input: FeaturePolicyInput): FeaturePolicyDecision {
    if (input.uxExperience.label === 'BLOCKED') {
      return Object.freeze({ status: 'BLOCKED', reason: 'Wellbeing protection active' });
    }
    return { status: 'ALLOWED' };
  },
});
