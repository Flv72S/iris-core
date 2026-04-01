/**
 * Phase 13XX-J — Cross-Network Trust Policies. Policy validator (deterministic).
 */

import type { TrustPolicy } from './trust_policy.js';
import { isValidPolicyType } from './policy_types.js';

/** Check that a value is deterministic (no functions, no symbols, JSON-serializable). */
function isDeterministicValue(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return typeof value !== 'number' || Number.isFinite(value);
  }
  if (typeof value === 'function' || typeof value === 'symbol') return false;
  if (Array.isArray(value)) return value.every(isDeterministicValue);
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(isDeterministicValue);
  }
  return false;
}

export class PolicyValidator {
  validatePolicy(policy: TrustPolicy): boolean {
    if (policy == null || typeof policy !== 'object') return false;
    if (typeof policy.policy_id !== 'string' || policy.policy_id.length === 0) return false;
    if (!isValidPolicyType(policy.policy_type)) return false;
    if (typeof policy.source_domain !== 'string' || policy.source_domain.length === 0)
      return false;
    if (typeof policy.target_domain !== 'string' || policy.target_domain.length === 0)
      return false;
    if (policy.parameters == null || typeof policy.parameters !== 'object') return false;
    if (!isDeterministicValue(policy.parameters)) return false;
    return true;
  }
}
