/**
 * Phase 13F — Trust Data Normalization Layer. Baseline engine.
 * Network-wide activity baseline for detecting abnormal activity.
 */

import type { NodeBehaviorProfile } from '../behavior_monitoring/index.js';

/**
 * Compute average total_events across profiles. Deterministic.
 * Empty profiles → return 0 (normalization will handle division).
 */
export function computeActivityBaseline(
  profiles: readonly NodeBehaviorProfile[]
): number {
  if (profiles.length === 0) return 0;
  let sum = 0;
  for (const p of profiles) {
    sum += p.total_events;
  }
  return sum / profiles.length;
}
