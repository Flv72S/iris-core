/**
 * Step 8B — Governance Policy Engine. Policy DSL types.
 */

export type PolicyOperator =
  | '<'
  | '>'
  | '<='
  | '>='
  | '=='
  | '!=';

/** Governance fields available in conditions: tier, score, normalized metrics. */
export const POLICY_FIELDS = [
  'tier',
  'score',
  'flipStability',
  'invariantIntegrity',
  'entropyControl',
  'violationPressure',
] as const;

export type PolicyField = (typeof POLICY_FIELDS)[number];

export interface PolicyCondition {
  readonly field: string;
  readonly operator: PolicyOperator;
  readonly value: number | string;
}

export type PolicyActionType =
  | 'block_feature'
  | 'allow_feature'
  | 'increase_audit_frequency'
  | 'require_certification';

export interface PolicyAction {
  readonly type: PolicyActionType;
  readonly params?: Readonly<Record<string, unknown>>;
}

export interface GovernancePolicy {
  readonly id: string;
  readonly description?: string;
  readonly condition: PolicyCondition;
  readonly action: PolicyAction;
}
