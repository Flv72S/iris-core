/**
 * S-4 — Risk envelope classification. Deterministic.
 */

import type { AggregatedRiskMetrics } from '../core/RiskTypes.js';
import type { RiskConfig } from '../core/RiskConfig.js';
import type { RiskEnvelopeClassification } from '../core/RiskTypes.js';

/**
 * SAFE: SafetyFailureRate == 0 && LivenessFailureRate == 0
 * STRESS: Failures == 0 but soft/liveness metrics exceed threshold
 * CRITICAL: Any violation > 0
 */
export function classifyRiskEnvelope(
  aggregated: AggregatedRiskMetrics,
  config: RiskConfig,
): RiskEnvelopeClassification {
  if (aggregated.runsWithSafetyViolation > 0 || aggregated.runsWithLivenessViolation > 0) {
    return 'CRITICAL';
  }
  const softOver = aggregated.maxSoftEventsObserved >= config.stressThresholdSoftEvents;
  const delayOver = aggregated.maxLivenessDelay >= config.stressThresholdLivenessDelay;
  const degradationOver =
    (aggregated.maxDegradationLatencyMultiplier !== undefined && aggregated.maxDegradationLatencyMultiplier >= 3) ||
    (aggregated.maxDegradationDrops !== undefined && aggregated.maxDegradationDrops >= 100) ||
    (aggregated.maxDegradationSaturationEvents !== undefined && aggregated.maxDegradationSaturationEvents >= 10);
  if (softOver || delayOver || degradationOver) return 'STRESS';
  return 'SAFE';
}
