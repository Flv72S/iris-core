/**
 * Microstep 10E — Governance Trust Policy Engine. Types.
 */

export interface TrustPolicy {
  readonly policy_id: string;
  readonly minimum_trust_score: number;
  readonly require_independent_attestations: number;
  readonly allowed_nodes?: readonly string[];
  readonly blocked_nodes?: readonly string[];
}

export interface TrustPolicyEvaluationInput {
  readonly node_id: string;
  readonly trust_score: number;
  readonly attestations: number;
}

export interface TrustPolicyEvaluationResult {
  readonly node_id: string;
  readonly accepted: boolean;
  readonly reason: string;
}

export type TrustDecisionOutcome = 'ACCEPT' | 'REJECT';

export interface TrustDecision {
  readonly node_id: string;
  readonly decision: TrustDecisionOutcome;
  readonly policy_id: string;
}
