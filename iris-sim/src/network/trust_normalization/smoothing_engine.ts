/**
 * Phase 13F — Trust Data Normalization Layer. Temporal smoothing.
 * Reduces metric volatility. 0 ≤ smoothing_factor ≤ 1.
 */

/**
 * Apply exponential smoothing: previous * factor + new * (1 - factor).
 * If smoothing_factor outside [0,1], clamp to [0,1] for determinism.
 */
export function applyTemporalSmoothing(
  previous_value: number,
  new_value: number,
  smoothing_factor: number
): number {
  const alpha = smoothing_factor < 0 ? 0 : smoothing_factor > 1 ? 1 : smoothing_factor;
  return previous_value * alpha + new_value * (1 - alpha);
}
