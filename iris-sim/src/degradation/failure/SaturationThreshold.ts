/**
 * S-6 — Saturation thresholds exposed as degradation signals for RiskEngine. Do not trigger CRITICAL directly.
 */

export interface SaturationSignals {
  readonly nodeSaturatedConsecutiveTicks: number;
  readonly dropRatePercent: number;
  readonly maxLatencyMultiplier: number;
}

export const DEFAULT_SATURATION_N_CONSECUTIVE = 5;
export const DEFAULT_SATURATION_DROP_RATE_PERCENT = 20;
export const DEFAULT_SATURATION_LATENCY_THRESHOLD = 3;

/**
 * Check if node state exceeds saturation thresholds (for reporting only).
 */
export function checkSaturationSignals(
  consecutiveSaturatedTicks: number,
  totalDropped: number,
  totalEnqueued: number,
  maxLatencyMultiplier: number,
): SaturationSignals {
  const dropRatePercent = totalEnqueued > 0 ? (100 * totalDropped) / totalEnqueued : 0;
  return Object.freeze({
    nodeSaturatedConsecutiveTicks: consecutiveSaturatedTicks,
    dropRatePercent,
    maxLatencyMultiplier,
  });
}
