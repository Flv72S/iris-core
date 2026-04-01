/**
 * FeatureSelfDisciplinePolicy — A feature must not activate if derivedState has no relevant supporting state.
 * Uses featureEligibility: no entry or eligible === false → BLOCKED.
 * Product-owned, deterministic. Does not execute.
 */

import type { FeatureActivationPolicy } from '../FeatureActivationPolicy';
import type { FeaturePolicyInput } from '../FeaturePolicyInput';
import type { FeaturePolicyDecision } from '../FeaturePolicyDecision';

export const FEATURE_SELF_DISCIPLINE_POLICY_ID = 'feature-self-discipline';

export const FeatureSelfDisciplinePolicy: FeatureActivationPolicy = Object.freeze({
  id: FEATURE_SELF_DISCIPLINE_POLICY_ID,
  evaluate(input: FeaturePolicyInput): FeaturePolicyDecision {
    const eligibility = input.derivedState.featureEligibility.find(
      (e) => e.featureId === input.featureId
    );
    if (eligibility == null || !eligibility.eligible) {
      return Object.freeze({
        status: 'BLOCKED',
        reason: 'No supporting system state',
      });
    }
    return { status: 'ALLOWED' };
  },
});
