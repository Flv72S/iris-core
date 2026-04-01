/**
 * S-4 — Deterministic stability index. No randomness.
 */

import type { AggregatedRiskMetrics } from '../core/RiskTypes.js';
import type { RiskConfig } from '../core/RiskConfig.js';

/**
 * stabilityIndex = 1 - weightedSafetyFailureRate - weightedLivenessFailureRate
 *   - normalizedMaxLivenessDelay - normalizedSoftExplosionFactor
 * Range: 0.0 (unstable) → 1.0 (fully stable).
 */
export function computeStabilityIndex(
  aggregated: AggregatedRiskMetrics,
  config: RiskConfig,
): number {
  const w = config.stabilityWeights;
  const safetyTerm = w.safetyFailure * aggregated.safetyFailureRate;
  const livenessTerm = w.livenessFailure * aggregated.livenessFailureRate;
  const maxDelayNorm = config.stressThresholdLivenessDelay > 0
    ? Math.min(1, aggregated.maxLivenessDelay / config.stressThresholdLivenessDelay) * w.maxLivenessDelayNorm
    : 0;
  const softNorm = config.stressThresholdSoftEvents > 0
    ? Math.min(1, aggregated.maxSoftEventsObserved / config.stressThresholdSoftEvents) * w.softExplosionNorm
    : 0;
  // S-6: deterministic, bounded degradation penalties (do not directly trigger CRITICAL).
  const dropNorm = aggregated.maxDegradationDrops !== undefined
    ? Math.min(1, aggregated.maxDegradationDrops / 2000)
    : 0;
  const saturationNorm = aggregated.maxDegradationSaturationEvents !== undefined
    ? Math.min(1, aggregated.maxDegradationSaturationEvents / 200)
    : 0;
  const latencyNorm = aggregated.maxDegradationLatencyMultiplier !== undefined
    ? Math.min(1, Math.max(0, aggregated.maxDegradationLatencyMultiplier - 1) / 3)
    : 0;
  const degradationPenalty = (0.15 * dropNorm) + (0.10 * saturationNorm) + (0.10 * latencyNorm);

  const index = 1 - safetyTerm - livenessTerm - maxDelayNorm - softNorm - degradationPenalty;
  return Math.max(0, Math.min(1, index));
}
