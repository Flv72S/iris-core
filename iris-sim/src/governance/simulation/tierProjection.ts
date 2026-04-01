/**
 * Step 7D — Tier projection from score. Uses same thresholds as Step 7A.
 */

import type { GovernanceTier, TierState } from '../tiering/hysteresis.js';
import { tierFromScore } from '../tiering/hysteresis.js';

/**
 * Project governance tier from score. Simulation uses score-to-tier mapping
 * (same thresholds as Step 7A) for deterministic, replayable results.
 */
export function projectTier(score: number, _state: TierState): GovernanceTier {
  return tierFromScore(score);
}
