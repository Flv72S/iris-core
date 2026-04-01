/**
 * Step 8C — Autonomy strategy. High violation pressure can downgrade autonomy.
 */

import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { AutonomyLevel } from '../types/adaptation_types.js';
import { getAdaptationProfileForTier } from '../profiles/adaptation_profiles.js';

const AUTONOMY_ORDER: AutonomyLevel[] = ['DISABLED', 'LIMITED', 'SUPERVISED', 'FULL'];

function autonomyIndex(level: AutonomyLevel): number {
  const i = AUTONOMY_ORDER.indexOf(level);
  return i >= 0 ? i : 0;
}

function oneLevelDown(level: AutonomyLevel): AutonomyLevel {
  const i = autonomyIndex(level);
  if (i <= 0) return 'DISABLED';
  return AUTONOMY_ORDER[i - 1];
}

/**
 * Compute autonomy level from snapshot. Profile base; high violationPressure downgrades.
 */
export function computeAutonomyLevel(snapshot: GovernanceTierSnapshot): AutonomyLevel {
  const profile = getAdaptationProfileForTier(snapshot.tier);
  let level = profile.autonomy;
  const pressure = snapshot.normalizedMetrics.violationPressure;
  if (pressure > 0.5) {
    level = oneLevelDown(level);
  }
  if (pressure > 0.75) {
    level = oneLevelDown(level);
  }
  return level;
}
