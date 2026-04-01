/**
 * Microstep 10E — Governance Trust Policy Engine. Policy definition.
 */

import type { TrustPolicy } from '../types/trust_policy_types.js';

/**
 * Create and validate a trust policy. Returns the policy (frozen).
 */
export function createTrustPolicy(policy: TrustPolicy): TrustPolicy {
  if (!validateTrustPolicy(policy)) {
    throw new Error('Invalid trust policy');
  }
  return Object.freeze({
    policy_id: policy.policy_id,
    minimum_trust_score: policy.minimum_trust_score,
    require_independent_attestations: policy.require_independent_attestations,
    ...(policy.allowed_nodes && { allowed_nodes: Object.freeze([...policy.allowed_nodes]) }),
    ...(policy.blocked_nodes && { blocked_nodes: Object.freeze([...policy.blocked_nodes]) }),
  });
}

/**
 * Validate policy: policy_id non vuoto, valori numerici validi,
 * allowed_nodes e blocked_nodes non sovrapposti.
 */
export function validateTrustPolicy(policy: TrustPolicy): boolean {
  if (typeof policy.policy_id !== 'string' || policy.policy_id.trim() === '') {
    return false;
  }
  if (
    typeof policy.minimum_trust_score !== 'number' ||
    policy.minimum_trust_score < 0 ||
    !Number.isFinite(policy.minimum_trust_score)
  ) {
    return false;
  }
  if (
    typeof policy.require_independent_attestations !== 'number' ||
    policy.require_independent_attestations < 0 ||
    !Number.isFinite(policy.require_independent_attestations)
  ) {
    return false;
  }
  const allowed = policy.allowed_nodes ?? [];
  const blocked = policy.blocked_nodes ?? [];
  const blockedSet = new Set(blocked);
  for (const id of allowed) {
    if (blockedSet.has(id)) return false;
  }
  return true;
}
