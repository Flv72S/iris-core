/**
 * S-6 — Dynamic latency: effectiveLatency = baseLatency * (1 + congestionLatencyFactor * queueRatio). Deterministic.
 */

import type { DegradationConfig } from '../core/DegradationConfig.js';

/**
 * Compute effective delivery delay (ticks) from base latency and current queue ratio.
 * queueRatio = currentQueueSize / maxQueueSizePerNode (capped at 1).
 */
export function computeEffectiveLatency(
  baseLatency: number,
  config: DegradationConfig,
  queueLength: number,
  latencyMultiplier: number,
): number {
  const maxQ = config.maxQueueSizePerNode;
  const queueRatio = maxQ > 0 ? Math.min(1, queueLength / maxQ) : 0;
  const factor = 1 + config.congestionLatencyFactor * queueRatio * latencyMultiplier;
  return Math.max(1, Math.floor(baseLatency * factor));
}
