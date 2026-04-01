/**
 * S-4 — Chaos metrics (per seed).
 */

export interface ChaosMetrics {
  readonly totalSoftEvents: number;
  readonly softEventBreakdown: Readonly<Record<string, number>>;
  readonly partitionEventCount: number;
  readonly splitBrainCount: number;
}

export function createChaosMetrics(
  totalSoftEvents: number,
  softEventBreakdown: Readonly<Record<string, number>>,
  partitionEventCount: number,
  splitBrainCount: number,
): ChaosMetrics {
  return Object.freeze({
    totalSoftEvents,
    softEventBreakdown: Object.freeze({ ...softEventBreakdown }),
    partitionEventCount,
    splitBrainCount,
  });
}
