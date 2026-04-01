/**
 * Phase 13A — Node Reputation Engine. Temporal decay for inactive nodes.
 * Deterministic; decay when time_inactive > 0.
 */

/**
 * Apply reputation decay when node has been inactive.
 * time_inactive = current_timestamp - last_activity_timestamp.
 * If time_inactive > 0: decayed_score = current_score * decay_factor.
 */
export function applyReputationDecay(
  current_score: number,
  last_activity_timestamp: number,
  current_timestamp: number,
  decay_factor: number
): number {
  const time_inactive = current_timestamp - last_activity_timestamp;
  if (time_inactive <= 0) return current_score;
  const decayed = current_score * decay_factor;
  return decayed < 0 ? 0 : decayed > 1 ? 1 : decayed;
}
