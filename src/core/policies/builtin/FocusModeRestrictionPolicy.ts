/**
 * FocusModeRestrictionPolicy — In FOCUS mode only whitelisted features (Daily Focus, Smart Summary) are allowed.
 * Product-owned, deterministic. Does not execute.
 */

import type { FeatureActivationPolicy } from '../FeatureActivationPolicy';
import type { FeaturePolicyInput } from '../FeaturePolicyInput';
import type { FeaturePolicyDecision } from '../FeaturePolicyDecision';

export const FOCUS_MODE_RESTRICTION_POLICY_ID = 'focus-mode-restriction';

const FOCUS_WHITELIST: readonly string[] = Object.freeze(['daily-focus', 'smart-summary']);

export const FocusModeRestrictionPolicy: FeatureActivationPolicy = Object.freeze({
  id: FOCUS_MODE_RESTRICTION_POLICY_ID,
  evaluate(input: FeaturePolicyInput): FeaturePolicyDecision {
    if (input.productMode !== 'FOCUS') return { status: 'ALLOWED' };
    if (FOCUS_WHITELIST.includes(input.featureId)) return { status: 'ALLOWED' };
    return Object.freeze({
      status: 'BLOCKED',
      reason: 'Focus mode: only Daily Focus and Smart Summary are allowed',
    });
  },
});
