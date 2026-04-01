/**
 * S-2 Refinement — Chaos report. Hard/soft invariant breakdown; serializable.
 */

import type { SystemMetrics } from './SystemMetricsCollector.js';
import type { HardInvariantType } from './InvariantTypes.js';
import type { SoftInvariantType } from './InvariantTypes.js';

export interface ChaosReportData {
  readonly attackSummary: readonly { kind: string; count: number }[];
  readonly hardInvariants: {
    readonly total: number;
    readonly breakdown: Readonly<Record<HardInvariantType, number>>;
  };
  readonly softEvents: {
    readonly total: number;
    readonly breakdown: Readonly<Record<SoftInvariantType, number>>;
  };
  readonly performanceMetrics: SystemMetrics;
  readonly peakStressIndicators: {
    readonly maxQueueDepth: number;
    readonly maxCrashedNodes: number;
    readonly maxPartitionCount: number;
  };
  readonly finalChaosHash: string;
  readonly simulationHash: string;
  readonly combinedHash: string;
}

export function createChaosReport(
  attackSummary: readonly { kind: string; count: number }[],
  hardBreakdown: Readonly<Record<HardInvariantType, number>>,
  softBreakdown: Readonly<Record<SoftInvariantType, number>>,
  metrics: SystemMetrics,
  peakStress: { maxQueueDepth: number; maxCrashedNodes: number; maxPartitionCount: number },
  chaosHash: string,
  simulationHash: string,
  combinedHash: string,
): ChaosReportData {
  let hardTotal = 0;
  for (const v of Object.values(hardBreakdown)) hardTotal += v;
  let softTotal = 0;
  for (const v of Object.values(softBreakdown)) softTotal += v;
  return Object.freeze({
    attackSummary,
    hardInvariants: Object.freeze({ total: hardTotal, breakdown: hardBreakdown }),
    softEvents: Object.freeze({ total: softTotal, breakdown: softBreakdown }),
    performanceMetrics: metrics,
    peakStressIndicators: Object.freeze(peakStress),
    finalChaosHash: chaosHash,
    simulationHash,
    combinedHash,
  });
}
