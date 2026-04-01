/**
 * Microstep 10J — Governance Trust Import & Validation Engine. Policy validator.
 */

import type { TrustPolicy } from '../../trust_policy/types/trust_policy_types.js';
import { validateTrustPolicy } from '../../trust_policy/policy/trust_policy_definition.js';

/**
 * Validate policies: structure, determinism, no duplicate policy_id.
 */
export function validatePolicies(policies: readonly TrustPolicy[]): boolean {
  const seen = new Set<string>();
  for (const p of policies) {
    if (!validateTrustPolicy(p)) return false;
    if (seen.has(p.policy_id)) return false;
    seen.add(p.policy_id);
  }
  return true;
}
