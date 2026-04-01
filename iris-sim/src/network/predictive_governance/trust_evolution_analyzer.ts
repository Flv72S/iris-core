/**
 * Phase 11F — Trust Evolution Analyzer.
 * Deterministic analysis of trust index history: delta, volatility, stability status.
 */

import type { TrustEvolutionPoint, TrustStabilityStatus } from './predictive_governance_types.js';

const VOLATILITY_STABLE_THRESHOLD = 0.05;
const DELTA_VOLATILE_BOUND = 0.1;
const DELTA_DECLINING_THRESHOLD = -0.1;
const DELTA_CRITICAL_THRESHOLD = -0.2;

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, x) => sum + (x - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}

/**
 * Analyze trust evolution from a time-ordered history. Deterministic.
 * History is sorted by timestamp ascending before analysis.
 */
export function analyzeTrustEvolution(
  history: readonly TrustEvolutionPoint[]
): { trust_delta: number; volatility_score: number; stability_status: TrustStabilityStatus } {
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  if (sorted.length === 0) {
    return { trust_delta: 0, volatility_score: 0, stability_status: 'STABLE' };
  }
  const values = sorted.map((p) => p.trust_index);
  const earliest = values[0]!;
  const latest = values[values.length - 1]!;
  const trust_delta = latest - earliest;
  const volatility_score = stdDev(values);

  let stability_status: TrustStabilityStatus;
  if (trust_delta < DELTA_CRITICAL_THRESHOLD) {
    stability_status = 'CRITICAL';
  } else if (trust_delta < DELTA_DECLINING_THRESHOLD) {
    stability_status = 'DECLINING';
  } else if (volatility_score >= VOLATILITY_STABLE_THRESHOLD && Math.abs(trust_delta) < DELTA_VOLATILE_BOUND) {
    stability_status = 'VOLATILE';
  } else {
    stability_status = 'STABLE';
  }

  return Object.freeze({ trust_delta, volatility_score, stability_status });
}
