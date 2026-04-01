/**
 * Step 8C — Audit strategy. Final multiplier = max(profile, policy).
 */

import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import { getAdaptationProfileForTier } from '../profiles/adaptation_profiles.js';

/**
 * Merge profile and policy audit multipliers. Final = max(profileMultiplier, policyMultiplier).
 */
export function computeAuditMultiplier(
  snapshot: GovernanceTierSnapshot,
  enforcement: PolicyEnforcementResult
): number {
  const profile = getAdaptationProfileForTier(snapshot.tier);
  const profileMultiplier = profile.auditFrequencyMultiplier;
  const policyMultiplier = enforcement.auditFrequencyMultiplier ?? 1;
  return Math.max(profileMultiplier, policyMultiplier);
}
