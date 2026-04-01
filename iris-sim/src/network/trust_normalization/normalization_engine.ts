/**
 * Phase 13F — Trust Data Normalization Layer. Metric normalization.
 * Deterministic; all scores clamped 0 ≤ score ≤ 1.
 */

import type { NodeBehaviorProfile } from '../behavior_monitoring/index.js';
import type { NormalizedBehaviorMetrics } from './trust_normalization_types.js';
import { computeActivityBaseline } from './baseline_engine.js';

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/**
 * Normalize a single behavior profile. All scores in [0, 1].
 */
export function normalizeBehaviorProfile(
  profile: NodeBehaviorProfile,
  activity_baseline: number,
  timestamp: number
): NormalizedBehaviorMetrics {
  const total = profile.total_events;

  const normalized_activity_score =
    activity_baseline > 0
      ? clamp01(Math.min(total / activity_baseline, 1))
      : total > 0 ? 1 : 0;

  const ratio = total > 0 ? (x: number) => clamp01(x / total) : () => 0;
  const normalized_consensus_score = ratio(profile.consensus_votes);
  const normalized_validation_score = ratio(profile.validations_performed);
  const normalized_governance_score = ratio(profile.governance_actions);

  return Object.freeze({
    node_id: profile.node_id,
    normalized_activity_score,
    normalized_consensus_score,
    normalized_validation_score,
    normalized_governance_score,
    activity_baseline,
    normalization_timestamp: timestamp,
  });
}

/**
 * Full pipeline: compute baseline, normalize each profile, return array.
 */
export function normalizeBehaviorProfiles(
  profiles: readonly NodeBehaviorProfile[],
  timestamp: number
): NormalizedBehaviorMetrics[] {
  const activity_baseline = computeActivityBaseline(profiles);
  return profiles.map((p) => normalizeBehaviorProfile(p, activity_baseline, timestamp));
}
