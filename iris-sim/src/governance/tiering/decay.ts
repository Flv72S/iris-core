/**
 * Step 7A — Temporal decay for event-based metrics.
 * score_adjusted = score * e^(-λ * Δt)
 */

import { clamp01 } from './normalization.js';

/**
 * Apply temporal decay. If lastCriticalTimestamp is null, no decay.
 * Δt = (now - lastCriticalTimestamp) / 1000 (seconds).
 */
export function applyTemporalDecay(
  score: number,
  lastCriticalTimestamp: number | null,
  lambda: number
): number {
  if (lastCriticalTimestamp === null) return clamp01(score);
  if (!Number.isFinite(score) || !Number.isFinite(lambda)) return clamp01(score);
  const now = Date.now();
  const dtSec = Math.max(0, (now - lastCriticalTimestamp) / 1000);
  const decayed = score * Math.exp(-lambda * dtSec);
  return clamp01(decayed);
}
