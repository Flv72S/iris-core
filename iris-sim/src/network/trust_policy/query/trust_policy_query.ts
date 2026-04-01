/**
 * Microstep 10E — Governance Trust Policy Engine. Policy query API.
 */

import type { TrustPolicy, TrustDecision } from '../types/trust_policy_types.js';
import { computeTrustDecision } from '../decision/trust_decision_engine.js';

/**
 * Get full trust decision for a node.
 */
export function getTrustDecision(
  policy: TrustPolicy,
  node_id: string,
  trust_score: number,
  attestations: number
): TrustDecision {
  return computeTrustDecision(policy, {
    node_id,
    trust_score,
    attestations,
  });
}

/**
 * Check if a node is trusted under the policy.
 */
export function isNodeTrusted(
  policy: TrustPolicy,
  node_id: string,
  trust_score: number,
  attestations: number
): boolean {
  const decision = getTrustDecision(policy, node_id, trust_score, attestations);
  return decision.decision === 'ACCEPT';
}
