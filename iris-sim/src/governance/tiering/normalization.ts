/**
 * Step 7A — Metric normalization. All metrics mapped to [0, 1].
 */

export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/**
 * Linear: value / max, clamped. Use when max > 0.
 */
export function normalizeLinear(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return clamp01(value / max);
}

/**
 * Log scaling: log(1 + value) / log(1 + max). For flipRate etc.
 */
export function normalizeLog(value: number, max: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (!Number.isFinite(max) || max <= 0) return clamp01(value);
  const x = Math.log1p(value);
  const m = Math.log1p(max);
  if (m <= 0) return 1;
  return clamp01(1 - x / m);
}

/**
 * Exponential penalty: e^(-factor * value). Higher value → lower score.
 */
export function normalizeExp(value: number, factor: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  if (!Number.isFinite(factor) || factor <= 0) return 1;
  return clamp01(Math.exp(-factor * value));
}
