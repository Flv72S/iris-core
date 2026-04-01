/**
 * Microstep 10E — Governance Trust Policy Engine. Trust decision engine.
 */

import type {
  TrustPolicy,
  TrustPolicyEvaluationInput,
  TrustDecision,
} from '../types/trust_policy_types.js';
import { evaluateTrustPolicy } from '../evaluation/trust_policy_evaluator.js';

/**
 * Compute trust decision for a node given policy and evaluation input.
 */
export function computeTrustDecision(
  policy: TrustPolicy,
  input: TrustPolicyEvaluationInput
): TrustDecision {
  const result = evaluateTrustPolicy(policy, input);
  return Object.freeze({
    node_id: result.node_id,
    decision: result.accepted ? 'ACCEPT' : 'REJECT',
    policy_id: policy.policy_id,
  });
}
