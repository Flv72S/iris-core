/**
 * S-4 — Risk quantification type definitions.
 * S-6: optional degradation metrics (drop, saturation, latency).
 */

import type { DegradationMetrics } from '../../degradation/metrics/DegradationMetrics.js';

export interface SeedResult {
  readonly seed: string;
  readonly simulationHash: string;
  readonly verificationHash: string;
  readonly hardViolationCount: number;
  readonly softEventCount: number;
  readonly safetyViolationCount: number;
  readonly livenessViolationCount: number;
  readonly maxLivenessDelayTicks: number;
  readonly partitionEventCount: number;
  readonly splitBrainCount: number;
  readonly totalTicks: number;
  readonly totalMessages: number;
  readonly deadlockDetected: boolean;
  readonly starvationCount: number;
  /** S-6: when degradation layer is enabled. */
  readonly degradationMetrics?: DegradationMetrics;
}

export interface AggregatedRiskMetrics {
  readonly totalRuns: number;
  readonly runsWithSafetyViolation: number;
  readonly runsWithLivenessViolation: number;
  readonly maxSoftEventsObserved: number;
  readonly avgSoftEvents: number;
  readonly maxLivenessDelay: number;
  readonly avgLivenessDelay: number;
  readonly worstPartitionDuration: number;
  readonly worstSplitBrainDuration: number;
  readonly safetyFailureRate: number;
  readonly livenessFailureRate: number;
  /** S-6: max over seeds (when degradation enabled). */
  readonly maxDegradationDrops?: number;
  readonly maxDegradationSaturationEvents?: number;
  readonly maxDegradationLatencyMultiplier?: number;
}

export type RiskEnvelopeClassification = 'SAFE' | 'STRESS' | 'CRITICAL';
