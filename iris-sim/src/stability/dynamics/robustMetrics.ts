/**
 * Stability Step 5C.1 — Robust metrics: MAD-based sigma, shock detection, meta-stability.
 * No external dependencies; deterministic.
 */

import type { RegimeSnapshot } from './dynamicsTypes.js';

const MAD_TO_SIGMA = 1.4826;

function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Robust standard deviation: 1.4826 * MAD (median absolute deviation).
 */
export function robustStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const m = median(sorted);
  const absDiffs = values.map((v) => Math.abs(v - m));
  absDiffs.sort((a, b) => a - b);
  const mad = median(absDiffs);
  return MAD_TO_SIGMA * mad;
}

export interface ShockDetectionResult {
  readonly hasShock: boolean;
  readonly shockCount: number;
}

/**
 * Isolated shock: point deviates > threshold * robustSigma while neighbors are stable.
 */
export function detectShock(values: number[], threshold: number): ShockDetectionResult {
  if (values.length < 3) return Object.freeze({ hasShock: false, shockCount: 0 });
  const sorted = [...values].sort((a, b) => a - b);
  const m = median(sorted);
  const sigma = robustStdDev(values);
  const effectiveSigma = sigma > 0 ? sigma : 0.01;
  let shockCount = 0;
  for (let i = 1; i < values.length - 1; i++) {
    const dev = Math.abs(values[i] - m);
    const prevStable = Math.abs(values[i - 1] - m) <= threshold * effectiveSigma;
    const nextStable = Math.abs(values[i + 1] - m) <= threshold * effectiveSigma;
    const isOutlier = sigma > 0 ? dev > threshold * sigma : dev > 0.1 && prevStable && nextStable;
    if (isOutlier && prevStable && nextStable) shockCount++;
  }
  return Object.freeze({ hasShock: shockCount > 0, shockCount });
}

/**
 * Meta-stability: low oscillation but frequent envelope micro-transitions or low plateau (avg SI < 0.6).
 */
export function detectMetaStability(
  history: RegimeSnapshot[],
  oscillationEpsilon: number
): boolean {
  if (history.length < 3) return false;
  const si = history.map((s) => s.stabilityIndex);
  const osc = robustStdDev(si);
  const avgSI = si.reduce((a, b) => a + b, 0) / si.length;
  let transitionCount = 0;
  for (let i = 1; i < history.length; i++) {
    if (history[i].envelopeState !== history[i - 1].envelopeState) transitionCount++;
  }
  const lowOscillation = osc < oscillationEpsilon;
  const frequentTransitions = transitionCount >= Math.max(2, history.length * 0.2);
  const lowPlateau = avgSI < 0.6;
  return lowOscillation && (frequentTransitions || lowPlateau);
}
