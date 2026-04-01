/**
 * S-6 — Snapshot of degradation state for a tick. For metrics and hash.
 */

import type { NodeDegradationState } from '../core/DegradationState.js';

export interface DegradationSnapshot {
  readonly tick: bigint;
  readonly nodeStates: ReadonlyArray<{
    readonly nodeId: string;
    readonly queueLength: number;
    readonly dropCount: number;
    readonly latencyMultiplier: number;
    readonly saturationTicks: number;
    readonly backpressureLevel: number;
  }>;
  readonly totalQueued: number;
  readonly totalDropped: number;
}

export function snapshotFromStates(tick: bigint, states: NodeDegradationState[]): DegradationSnapshot {
  let totalQueued = 0;
  let totalDropped = 0;
  const nodeStates = states.map((s) => {
    totalQueued += s.inboundQueue.length;
    totalDropped += s.dropCount;
    return Object.freeze({
      nodeId: s.nodeId,
      queueLength: s.inboundQueue.length,
      dropCount: s.dropCount,
      latencyMultiplier: s.latencyMultiplier,
      saturationTicks: s.saturationTicksConsecutive,
      backpressureLevel: s.backpressureLevel,
    });
  });
  return Object.freeze({
    tick,
    nodeStates,
    totalQueued,
    totalDropped,
  });
}
