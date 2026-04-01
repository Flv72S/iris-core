/**
 * S-6 — Per-node degradation state. Deterministic, no hidden state.
 */

import type { SimulatedMessage } from '../../simulation/node/NodeTypes.js';

export interface QueuedMessage {
  readonly message: SimulatedMessage;
  readonly enqueueTick: bigint;
  readonly deliveryTick: bigint;
}

export interface NodeDegradationState {
  readonly nodeId: string;
  inboundQueue: QueuedMessage[];
  outboundQueueLength: number;
  dropCount: number;
  latencyMultiplier: number;
  saturationTicksConsecutive: number;
  backpressureLevel: number;
}

export function createNodeDegradationState(nodeId: string): NodeDegradationState {
  return {
    nodeId,
    inboundQueue: [],
    outboundQueueLength: 0,
    dropCount: 0,
    latencyMultiplier: 1,
    saturationTicksConsecutive: 0,
    backpressureLevel: 0,
  };
}
