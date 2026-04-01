/**
 * Step 7D — Metric perturbation. Bounded, gradual, numerically stable.
 */

/**
 * Perturb a metric value. Result always in [0, 1].
 * direction: "decrease" → value goes down, "increase" → value goes up.
 */
export function perturbMetric(
  value: number,
  intensity: number,
  direction: 'increase' | 'decrease'
): number {
  const v = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  const i = Number.isFinite(intensity) ? Math.max(0, Math.min(1, intensity)) : 0;
  const delta = 0.3 * i;
  if (direction === 'decrease') {
    return Math.max(0, v - delta);
  }
  return Math.min(1, v + delta);
}
