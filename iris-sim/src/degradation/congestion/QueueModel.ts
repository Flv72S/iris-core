/**
 * S-6 — Deterministic inbound queue model.
 */

import type { QueuedMessage } from '../core/DegradationState.js';
import type { DegradationConfig } from '../core/DegradationConfig.js';

export interface QueueModelResult {
  readonly processed: QueuedMessage[];
  readonly remaining: QueuedMessage[];
  readonly saturationEvent: boolean;
}

export function processInboundQueue(
  queue: QueuedMessage[],
  config: DegradationConfig,
  currentTick: bigint,
): QueueModelResult {
  const capacity = config.baseProcessingCapacityPerTick;
  const saturationEvent = queue.length > config.maxQueueSizePerNode;
  const processed: QueuedMessage[] = [];
  const remaining: QueuedMessage[] = [];
  let taken = 0;
  for (const q of queue) {
    if (taken < capacity && q.deliveryTick <= currentTick) {
      processed.push(q);
      taken++;
    } else {
      remaining.push(q);
    }
  }
  return Object.freeze({ processed, remaining, saturationEvent });
}
