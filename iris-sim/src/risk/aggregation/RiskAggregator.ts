/**
 * S-4 — Aggregate risk metrics across N seeds. Deterministic.
 */

import type { SeedResult } from '../core/RiskTypes.js';
import type { AggregatedRiskMetrics } from '../core/RiskTypes.js';

export function aggregateSeedResults(results: readonly SeedResult[]): AggregatedRiskMetrics {
  const totalRuns = results.length;
  let runsWithSafetyViolation = 0;
  let runsWithLivenessViolation = 0;
  let maxSoftEventsObserved = 0;
  let sumSoftEvents = 0;
  let maxLivenessDelay = 0;
  let sumLivenessDelay = 0;
  let worstPartitionDuration = 0;
  let worstSplitBrainDuration = 0;

  let maxDegradationDrops = 0;
  let maxDegradationSaturation = 0;
  let maxDegradationLatency = 0;

  for (const r of results) {
    if (r.safetyViolationCount > 0) runsWithSafetyViolation += 1;
    if (r.livenessViolationCount > 0) runsWithLivenessViolation += 1;
    if (r.softEventCount > maxSoftEventsObserved) maxSoftEventsObserved = r.softEventCount;
    sumSoftEvents += r.softEventCount;
    if (r.maxLivenessDelayTicks > maxLivenessDelay) maxLivenessDelay = r.maxLivenessDelayTicks;
    sumLivenessDelay += r.maxLivenessDelayTicks;
    if (r.partitionEventCount > worstPartitionDuration) worstPartitionDuration = r.partitionEventCount;
    if (r.splitBrainCount > worstSplitBrainDuration) worstSplitBrainDuration = r.splitBrainCount;
    const dm = r.degradationMetrics;
    if (dm) {
      if (dm.totalDroppedMessages > maxDegradationDrops) maxDegradationDrops = dm.totalDroppedMessages;
      if (dm.saturationEventCount > maxDegradationSaturation) maxDegradationSaturation = dm.saturationEventCount;
      if (dm.maxLatencyMultiplier > maxDegradationLatency) maxDegradationLatency = dm.maxLatencyMultiplier;
    }
  }

  const avgSoftEvents = totalRuns > 0 ? sumSoftEvents / totalRuns : 0;
  const avgLivenessDelay = totalRuns > 0 ? sumLivenessDelay / totalRuns : 0;
  const safetyFailureRate = totalRuns > 0 ? runsWithSafetyViolation / totalRuns : 0;
  const livenessFailureRate = totalRuns > 0 ? runsWithLivenessViolation / totalRuns : 0;

  const out: AggregatedRiskMetrics = Object.freeze({
    totalRuns,
    runsWithSafetyViolation,
    runsWithLivenessViolation,
    maxSoftEventsObserved,
    avgSoftEvents,
    maxLivenessDelay,
    avgLivenessDelay,
    worstPartitionDuration,
    worstSplitBrainDuration,
    safetyFailureRate,
    livenessFailureRate,
  });
  if (maxDegradationDrops > 0 || maxDegradationSaturation > 0 || maxDegradationLatency > 0) {
    return Object.freeze({
      ...out,
      maxDegradationDrops,
      maxDegradationSaturationEvents: maxDegradationSaturation,
      maxDegradationLatencyMultiplier: maxDegradationLatency,
    });
  }
  return out;
}
