/**
 * Feature Activation Policies
 *
 * This layer defines when a feature is allowed to act.
 * It does not execute, optimize or adapt.
 * All rules are explicit, deterministic and product-owned.
 */

import type { FeatureActivationPolicy } from './FeatureActivationPolicy';
import type { FeaturePolicyInput } from './FeaturePolicyInput';
import type { FeaturePolicyDecision } from './FeaturePolicyDecision';
import { isPolicyEnabled } from './kill-switch/PolicyKillSwitch';
import type { PolicyKillSwitchRegistry } from './kill-switch/PolicyKillSwitch';
import { appendPolicyAudit } from './audit/PolicyAuditLog';

/**
 * Evaluates all enabled policies in order. First BLOCKED stops; if none block, returns ALLOWED.
 * No priority or scoring. Policies do not execute actions.
 */
export function evaluate(
  policies: readonly FeatureActivationPolicy[],
  input: FeaturePolicyInput,
  killSwitch: PolicyKillSwitchRegistry
): FeaturePolicyDecision {
  const now = input.now;

  for (const policy of policies) {
    if (!isPolicyEnabled(killSwitch, policy.id)) continue;

    const decision = policy.evaluate(input);
    appendPolicyAudit(
      Object.freeze({
        featureId: input.featureId,
        policyId: policy.id,
        decision,
        evaluatedAt: now,
      })
    );

    if (decision.status === 'BLOCKED') return decision;
  }

  return { status: 'ALLOWED' };
}

/** @deprecated Use evaluate. */
export function evaluateFeaturePolicies(
  policies: readonly FeatureActivationPolicy[],
  input: FeaturePolicyInput,
  killSwitch: PolicyKillSwitchRegistry
): FeaturePolicyDecision {
  return evaluate(policies, input, killSwitch);
}

export class FeaturePolicyEngine {
  constructor(
    private readonly policies: readonly FeatureActivationPolicy[],
    private readonly killSwitch: PolicyKillSwitchRegistry
  ) {}

  evaluate(input: FeaturePolicyInput): FeaturePolicyDecision {
    return evaluate(this.policies, input, this.killSwitch);
  }
}
