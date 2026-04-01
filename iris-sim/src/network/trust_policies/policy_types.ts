/**
 * Phase 13XX-J — Cross-Network Trust Policies. Policy types.
 */

export type PolicyType =
  | 'TRUST_PROPAGATION_LIMIT'
  | 'CROSS_NETWORK_WEIGHT'
  | 'DOMAIN_INTERACTION_RULE';

const POLICY_TYPES: readonly PolicyType[] = [
  'TRUST_PROPAGATION_LIMIT',
  'CROSS_NETWORK_WEIGHT',
  'DOMAIN_INTERACTION_RULE',
];

export function isValidPolicyType(value: string): value is PolicyType {
  return POLICY_TYPES.includes(value as PolicyType);
}
