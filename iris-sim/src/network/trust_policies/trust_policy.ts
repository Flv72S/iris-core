/**
 * Phase 13XX-J — Cross-Network Trust Policies. Trust policy.
 */

import type { PolicyType } from './policy_types.js';

export interface TrustPolicy {
  readonly policy_id: string;
  readonly policy_type: PolicyType;
  readonly source_domain: string;
  readonly target_domain: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

/** Example parameter keys (not exhaustive). */
export const PARAM_MAX_TRUST_PROPAGATION_DEPTH = 'max_trust_propagation_depth';
export const PARAM_CROSS_NETWORK_WEIGHT = 'cross_network_weight';
export const PARAM_INTERACTION_ALLOWED = 'interaction_allowed';
