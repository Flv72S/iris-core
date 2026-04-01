/**
 * Microstep 10E — Governance Trust Policy Engine. Policy evaluation.
 */

import type {
  TrustPolicy,
  TrustPolicyEvaluationInput,
  TrustPolicyEvaluationResult,
} from '../types/trust_policy_types.js';

/**
 * Evaluate a node against the policy.
 * Order: blocked → REJECT; allowed (if list exists and node in list) then checks; trust_score; attestations; else ACCEPT.
 */
export function evaluateTrustPolicy(
  policy: TrustPolicy,
  input: TrustPolicyEvaluationInput
): TrustPolicyEvaluationResult {
  const { node_id, trust_score, attestations } = input;

  if (policy.blocked_nodes?.includes(node_id)) {
    return Object.freeze({
      node_id,
      accepted: false,
      reason: 'blocked',
    });
  }

  if (policy.allowed_nodes !== undefined && policy.allowed_nodes.length > 0) {
    if (policy.allowed_nodes.includes(node_id)) {
      return Object.freeze({
        node_id,
        accepted: true,
        reason: 'accepted',
      });
    }
    return Object.freeze({
      node_id,
      accepted: false,
      reason: 'not_allowed',
    });
  }

  if (trust_score < policy.minimum_trust_score) {
    return Object.freeze({
      node_id,
      accepted: false,
      reason: 'insufficient_trust_score',
    });
  }

  if (attestations < policy.require_independent_attestations) {
    return Object.freeze({
      node_id,
      accepted: false,
      reason: 'insufficient_attestations',
    });
  }

  return Object.freeze({
    node_id,
    accepted: true,
    reason: 'accepted',
  });
}
