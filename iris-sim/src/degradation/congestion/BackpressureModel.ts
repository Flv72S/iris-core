/**
 * S-6 — Deterministic backpressure: when outbound queue exceeds threshold, reduce capacity and increase latency.
 */

import type { DegradationConfig } from '../core/DegradationConfig.js';
import type { NodeDegradationState } from '../core/DegradationState.js';

const OUTBOUND_THRESHOLD_RATIO = 0.8;

/**
 * Compute backpressure level and resulting capacity multiplier and latency delta for next tick.
 */
export function computeBackpressure(
  state: NodeDegradationState,
  config: DegradationConfig,
): { capacityMultiplier: number; latencyDelta: number; backpressureLevel: number } {
  const threshold = Math.floor(config.maxQueueSizePerNode * OUTBOUND_THRESHOLD_RATIO);
  if (state.outboundQueueLength <= threshold) {
    return { capacityMultiplier: 1, latencyDelta: 0, backpressureLevel: 0 };
  }
  const over = state.outboundQueueLength - threshold;
  const range = config.maxQueueSizePerNode - threshold;
  const ratio = Math.min(1, range > 0 ? over / range : 1);
  const capacityMultiplier = Math.max(0.2, 1 - ratio * 0.8);
  const latencyDelta = ratio * 0.5;
  const backpressureLevel = Math.min(10, Math.floor(ratio * 10));
  return Object.freeze({ capacityMultiplier, latencyDelta, backpressureLevel });
}
