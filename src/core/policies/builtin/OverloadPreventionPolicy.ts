/**
 * OverloadPreventionPolicy — When uxExperience.label === 'OVERLOADED', block features with priority !== 'high'.
 * Product-owned, deterministic. Does not execute.
 */

import type { FeatureActivationPolicy } from '../FeatureActivationPolicy';
import type { FeaturePolicyInput } from '../FeaturePolicyInput';
import type { FeaturePolicyDecision } from '../FeaturePolicyDecision';

export const OVERLOAD_PREVENTION_POLICY_ID = 'overload-prevention';

export const OverloadPreventionPolicy: FeatureActivationPolicy = Object.freeze({
  id: OVERLOAD_PREVENTION_POLICY_ID,
  evaluate(input: FeaturePolicyInput): FeaturePolicyDecision {
    if (input.uxExperience.label !== 'OVERLOADED') return { status: 'ALLOWED' };
    const priority = input.featurePriority ?? 'normal';
    if (priority === 'high') return { status: 'ALLOWED' };
    return Object.freeze({
      status: 'BLOCKED',
      reason: 'Overload prevention: only high-priority features are allowed',
    });
  },
});
