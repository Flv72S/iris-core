/**
 * S-4 — Deterministic risk report hash. Stable across identical runs.
 */

import { createHash } from 'crypto';
import type { SeedResult } from '../core/RiskTypes.js';
import type { AggregatedRiskMetrics } from '../core/RiskTypes.js';
import type { RiskEnvelopeClassification } from '../core/RiskTypes.js';

function canonicalSeedResult(r: SeedResult): string {
  const dm = r.degradationMetrics;
  return [
    r.seed,
    r.simulationHash,
    r.verificationHash,
    String(r.hardViolationCount),
    String(r.softEventCount),
    String(r.safetyViolationCount),
    String(r.livenessViolationCount),
    String(r.maxLivenessDelayTicks),
    String(r.partitionEventCount),
    String(r.splitBrainCount),
    String(r.totalTicks),
    String(r.totalMessages),
    r.deadlockDetected ? '1' : '0',
    String(r.starvationCount),
    // S-6 degradation metrics (blank when disabled)
    dm ? String(dm.maxQueueSizeObserved) : '',
    dm ? String(dm.totalDroppedMessages) : '',
    dm ? String(dm.maxLatencyMultiplier) : '',
    dm ? String(dm.saturationEventCount) : '',
    dm ? String(dm.maxBackpressureDepth) : '',
  ].join('|');
}

function canonicalAggregated(a: AggregatedRiskMetrics): string {
  return [
    String(a.totalRuns),
    String(a.runsWithSafetyViolation),
    String(a.runsWithLivenessViolation),
    String(a.maxSoftEventsObserved),
    String(a.avgSoftEvents),
    String(a.maxLivenessDelay),
    String(a.avgLivenessDelay),
    String(a.worstPartitionDuration),
    String(a.worstSplitBrainDuration),
    String(a.safetyFailureRate),
    String(a.livenessFailureRate),
    // S-6 aggregated degradation signals (blank when disabled)
    a.maxDegradationDrops !== undefined ? String(a.maxDegradationDrops) : '',
    a.maxDegradationSaturationEvents !== undefined ? String(a.maxDegradationSaturationEvents) : '',
    a.maxDegradationLatencyMultiplier !== undefined ? String(a.maxDegradationLatencyMultiplier) : '',
  ].join('|');
}

/**
 * Hash from sorted seed results + aggregated + stability + envelope. No console/format dependency.
 */
export function computeRiskReportHash(
  seedResults: readonly SeedResult[],
  aggregated: AggregatedRiskMetrics,
  stabilityIndex: number,
  riskEnvelope: RiskEnvelopeClassification,
): string {
  const sorted = [...seedResults].sort((a, b) => (a.seed < b.seed ? -1 : a.seed > b.seed ? 1 : 0));
  const seedsPayload = sorted.map(canonicalSeedResult).join('\n');
  const aggPayload = canonicalAggregated(aggregated);
  const payload = seedsPayload + '\n---\n' + aggPayload + '\n' + String(stabilityIndex) + '\n' + riskEnvelope;
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}
