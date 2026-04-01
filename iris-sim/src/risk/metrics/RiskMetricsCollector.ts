/**
 * S-4 — Collect risk metrics from chaos run + verification run (per seed).
 * S-6: optional degradation metrics merged from chaos/verification runs.
 */

import type { SeedResult } from '../core/RiskTypes.js';
import type { VerificationReport } from '../../verification/reporting/VerificationReport.js';
import type { DegradationMetrics } from '../../degradation/metrics/DegradationMetrics.js';

export interface ChaosRunData {
  readonly simulationHash: string;
  readonly hardViolationCount: number;
  readonly softEventCount: number;
  readonly softEventBreakdown: Readonly<Record<string, number>>;
  readonly partitionCount: number;
  readonly degradationMetrics?: DegradationMetrics;
}

export interface VerificationRunData {
  readonly simulationHash: string;
  readonly verificationHash: string;
  readonly report: VerificationReport;
}

/** Merge degradation metrics (take max of each field). */
function mergeDegradationMetrics(
  a?: DegradationMetrics,
  b?: DegradationMetrics,
): DegradationMetrics | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return {
    maxQueueSizeObserved: Math.max(a.maxQueueSizeObserved, b.maxQueueSizeObserved),
    totalDroppedMessages: Math.max(a.totalDroppedMessages, b.totalDroppedMessages),
    maxLatencyMultiplier: Math.max(a.maxLatencyMultiplier, b.maxLatencyMultiplier),
    saturationEventCount: Math.max(a.saturationEventCount, b.saturationEventCount),
    maxBackpressureDepth: Math.max(a.maxBackpressureDepth, b.maxBackpressureDepth),
  };
}

export function collectSeedResult(
  seed: string,
  chaosData: ChaosRunData,
  verificationData: VerificationRunData,
  totalTicks: number,
  totalMessages: number,
  verificationDegradation?: DegradationMetrics,
): SeedResult {
  const safetyViolations = verificationData.report.safetyResults.filter((r) => r.status === 'VIOLATED').length;
  const livenessViolations = verificationData.report.livenessResults.filter((r) => r.status === 'VIOLATED').length;
  const deadlock = verificationData.report.livenessResults.some((r) => r.id === 'NoDeadlock' && r.status === 'VIOLATED');
  const starvation = verificationData.report.livenessResults.some((r) => r.id === 'NoStarvation' && r.status === 'VIOLATED');
  const partitionEventCount = chaosData.partitionCount;
  const splitBrainCount = 0;
  const degradationMetrics = mergeDegradationMetrics(chaosData.degradationMetrics, verificationDegradation);

  return Object.freeze({
    seed,
    simulationHash: verificationData.simulationHash,
    verificationHash: verificationData.verificationHash,
    hardViolationCount: chaosData.hardViolationCount,
    softEventCount: chaosData.softEventCount,
    safetyViolationCount: safetyViolations,
    livenessViolationCount: livenessViolations,
    maxLivenessDelayTicks: 0,
    partitionEventCount,
    splitBrainCount,
    totalTicks,
    totalMessages,
    deadlockDetected: deadlock,
    starvationCount: starvation ? 1 : 0,
    ...(degradationMetrics ? { degradationMetrics } : {}),
  });
}
