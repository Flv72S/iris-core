/**
 * Step 8B — Enforcement engine. Aggregates active policies into a single result.
 */

import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { GovernancePolicy } from '../types/policy_types.js';
import { evaluatePolicy } from '../evaluator/policy_evaluator.js';

export interface PolicyEnforcementResult {
  readonly blockedFeatures: readonly string[];
  readonly allowedFeatures: readonly string[];
  readonly auditFrequencyMultiplier?: number;
  readonly certificationRequired?: boolean;
}

const DEFAULT_RESULT: PolicyEnforcementResult = Object.freeze({
  blockedFeatures: [],
  allowedFeatures: [],
});

/**
 * Evaluate all policies against the snapshot and aggregate actions into a single result.
 */
export function evaluatePolicies(
  policies: readonly GovernancePolicy[],
  snapshot: GovernanceTierSnapshot
): PolicyEnforcementResult {
  const blocked = new Set<string>();
  const allowed = new Set<string>();
  let auditFrequencyMultiplier: number | undefined;
  let certificationRequired: boolean | undefined;

  for (const policy of policies) {
    if (!evaluatePolicy(policy, snapshot)) continue;
    const action = policy.action;
    switch (action.type) {
      case 'block_feature': {
        const feature = action.params?.feature;
        if (typeof feature === 'string') blocked.add(feature);
        break;
      }
      case 'allow_feature': {
        const feature = action.params?.feature;
        if (typeof feature === 'string') allowed.add(feature);
        break;
      }
      case 'increase_audit_frequency':
        auditFrequencyMultiplier = (auditFrequencyMultiplier ?? 1) * 1.5;
        break;
      case 'require_certification':
        certificationRequired = true;
        break;
    }
  }

  if (
    blocked.size === 0 &&
    allowed.size === 0 &&
    auditFrequencyMultiplier === undefined &&
    certificationRequired === undefined
  ) {
    return DEFAULT_RESULT;
  }

  return Object.freeze({
    blockedFeatures: Object.freeze([...blocked]),
    allowedFeatures: Object.freeze([...allowed]),
    ...(auditFrequencyMultiplier !== undefined && { auditFrequencyMultiplier }),
    ...(certificationRequired !== undefined && { certificationRequired }),
  });
}
