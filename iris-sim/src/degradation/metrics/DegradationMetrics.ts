/**
 * S-6 — Aggregate degradation metrics for S-4.
 */

export interface DegradationMetrics {
  readonly maxQueueSizeObserved: number;
  readonly totalDroppedMessages: number;
  readonly maxLatencyMultiplier: number;
  readonly saturationEventCount: number;
  readonly maxBackpressureDepth: number;
}

export function createEmptyDegradationMetrics(): DegradationMetrics {
  return Object.freeze({
    maxQueueSizeObserved: 0,
    totalDroppedMessages: 0,
    maxLatencyMultiplier: 0,
    saturationEventCount: 0,
    maxBackpressureDepth: 0,
  });
}
