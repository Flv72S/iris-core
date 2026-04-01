/**
 * S-6 — Deterministic message drop when queueRatio > dropThresholdRatio. Seed-driven.
 */

import { createHash } from 'crypto';
import type { DegradationConfig } from '../core/DegradationConfig.js';
import type { QueuedMessage } from '../core/DegradationState.js';

/**
 * Deterministic drop index: hash(seed + tick + nodeId) % queueLength.
 * Returns index to drop, or -1 if no drop.
 */
export function computeDropIndex(
  seed: string,
  tick: bigint,
  nodeId: string,
  queueLength: number,
  config: DegradationConfig,
): number {
  if (queueLength === 0) return -1;
  const maxQ = config.maxQueueSizePerNode;
  const ratio = maxQ > 0 ? queueLength / maxQ : 0;
  if (ratio <= config.dropThresholdRatio) return -1;
  const payload = seed + ':' + String(tick) + ':' + nodeId;
  const h = createHash('sha256').update(payload, 'utf8').digest('hex');
  const num = parseInt(h.slice(0, 8), 16);
  return num % queueLength;
}

/**
 * Remove one message at dropIndex from queue. Deterministic order preserved.
 */
export function applyDrop(queue: QueuedMessage[], dropIndex: number): { dropped: QueuedMessage; remaining: QueuedMessage[] } {
  const remaining = queue.filter((_, i) => i !== dropIndex);
  const dropped = queue[dropIndex];
  if (!dropped) throw new Error('Invalid dropIndex');
  return { dropped, remaining };
}
