/**
 * S-4 — Performance metrics (per seed).
 */

export interface PerformanceMetrics {
  readonly totalTicks: number;
  readonly totalMessages: number;
  readonly eventThroughput: number;
}

export function createPerformanceMetrics(
  totalTicks: number,
  totalMessages: number,
): PerformanceMetrics {
  const eventThroughput = totalTicks > 0 ? totalMessages / Number(totalTicks) : 0;
  return Object.freeze({
    totalTicks,
    totalMessages,
    eventThroughput,
  });
}
