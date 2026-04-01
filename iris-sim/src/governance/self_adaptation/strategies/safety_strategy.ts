/**
 * Step 8C — Safety strategy. High violation pressure increases constraint level.
 */

import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import { getAdaptationProfileForTier } from '../profiles/adaptation_profiles.js';
import { clamp01 } from '../../tiering/normalization.js';

/**
 * Base level from profile; if violationPressure > 0.5 increase constraint.
 */
export function computeSafetyConstraintLevel(snapshot: GovernanceTierSnapshot): number {
  const profile = getAdaptationProfileForTier(snapshot.tier);
  let level = profile.safetyConstraintLevel;
  const pressure = snapshot.normalizedMetrics.violationPressure;
  if (pressure > 0.5) {
    level = clamp01(level + 0.2);
  }
  if (pressure > 0.75) {
    level = clamp01(level + 0.2);
  }
  return level;
}
