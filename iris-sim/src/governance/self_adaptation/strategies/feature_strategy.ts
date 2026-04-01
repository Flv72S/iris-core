/**
 * Step 8C — Feature strategy. Profile features minus policy-blocked; policy has priority.
 */

import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import { getAdaptationProfileForTier } from '../profiles/adaptation_profiles.js';

/**
 * Resolve allowed features: profile allowed set minus enforcement blocked set.
 * Policy blocking has priority.
 */
export function resolveAllowedFeatures(
  snapshot: GovernanceTierSnapshot,
  enforcement: PolicyEnforcementResult
): readonly string[] {
  const profile = getAdaptationProfileForTier(snapshot.tier);
  const fromProfile = profile.allowedFeatureSet;
  const blocked = new Set(enforcement.blockedFeatures);
  const allowed = fromProfile.filter((f) => !blocked.has(f));
  return Object.freeze([...allowed]);
}
