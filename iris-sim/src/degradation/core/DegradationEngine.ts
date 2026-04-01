/**
 * S-6 — Integrated degradation: queues, backpressure, latency, drops, correlated failure. Runs before delivery.
 */

import type { SimulatedMessage } from '../../simulation/node/NodeTypes.js';
import type { DegradationConfig } from './DegradationConfig.js';
import {
  createNodeDegradationState,
  type NodeDegradationState,
} from './DegradationState.js';
import { processInboundQueue } from '../congestion/QueueModel.js';
import { computeBackpressure } from '../congestion/BackpressureModel.js';
import { computeEffectiveLatency } from '../congestion/LatencyAmplifier.js';
import { computeDropIndex, applyDrop } from '../failure/DeterministicDropModel.js';
import {
  isInCorrelatedFailureWindow,
  correlatedCapacityMultiplier,
} from '../failure/CorrelatedFailureModel.js';
import type { DegradationMetrics } from '../metrics/DegradationMetrics.js';
import { createEmptyDegradationMetrics } from '../metrics/DegradationMetrics.js';

export type DeliverToNodeFn = (nodeId: string, message: SimulatedMessage) => void;
export type GetPartitionedFn = (fromCluster: string, toCluster: string) => boolean;

export interface DegradationEngineParams {
  readonly config: DegradationConfig;
  readonly seed: string;
  readonly baseLatency: number;
  getCurrentTick: () => bigint;
  getPartitioned: GetPartitionedFn;
  deliverToNode: DeliverToNodeFn;
}

export class DegradationEngine {
  private readonly _params: DegradationEngineParams;
  private readonly _stateByNode = new Map<string, NodeDegradationState>();
  private _metrics: DegradationMetrics = createEmptyDegradationMetrics();
  private _totalEnqueued = 0;
  private _messagesDelivered = 0;

  constructor(params: DegradationEngineParams) {
    this._params = params;
  }

  private _getState(nodeId: string): NodeDegradationState {
    let s = this._stateByNode.get(nodeId);
    if (!s) {
      s = createNodeDegradationState(nodeId);
      this._stateByNode.set(nodeId, s);
    }
    return s;
  }

  enqueueMessage(msg: SimulatedMessage, fromCluster: string, toCluster: string): void {
    if (!this._params.config.degradationEnabled) return;
    if (this._params.getPartitioned(fromCluster, toCluster)) return;
    const state = this._getState(msg.toNodeId);
    const tick = this._params.getCurrentTick();
    const latency = computeEffectiveLatency(
      this._params.baseLatency,
      this._params.config,
      state.inboundQueue.length,
      state.latencyMultiplier,
    );
    const deliveryTick = tick + BigInt(latency);
    state.inboundQueue.push(
      Object.freeze({ message: msg, enqueueTick: tick, deliveryTick }),
    );
    this._totalEnqueued++;
    const fromState = this._getState(msg.fromNodeId);
    fromState.outboundQueueLength++;
  }

  tick(currentTick: bigint): void {
    if (!this._params.config.degradationEnabled) return;
    const { config, seed, deliverToNode } = this._params;
    const nodeIds = [...this._stateByNode.keys()].slice().sort();
    const inCorrelatedWindow = isInCorrelatedFailureWindow(seed, currentTick, config);
    const correlatedCap = correlatedCapacityMultiplier(inCorrelatedWindow, config);

    const maxQ = config.maxQueueSizePerNode;
    // S-6A: congestion factor in [0,1] for positive congestion feedback (bounded).
    let congestionFactor = 0;
    if (maxQ > 0 && (config.positiveCongestionAlpha ?? 0) > 0) {
      for (const nid of nodeIds) {
        const s = this._getState(nid);
        const ratio = Math.min(1, s.inboundQueue.length / maxQ);
        if (ratio > congestionFactor) congestionFactor = ratio;
      }
    }

    // Deterministic upstream backpressure propagation: congested receivers push pressure to senders.
    const propagated = new Map<string, number>();
    for (const nid of nodeIds) {
      const s = this._getState(nid);
      const ratio = maxQ > 0 ? Math.min(1, s.inboundQueue.length / maxQ) : 0;
      const receiverPressure = Math.floor(ratio * 10);
      if (receiverPressure <= 0) continue;
      for (const q of s.inboundQueue) {
        const from = q.message.fromNodeId;
        propagated.set(from, (propagated.get(from) ?? 0) + receiverPressure);
      }
    }

    for (const nid of nodeIds) {
      const s = this._getState(nid);
      const bp = config.disableBackpressure
        ? { capacityMultiplier: 1, latencyDelta: 0, backpressureLevel: 0 }
        : computeBackpressure(s, config);
      const upstream = propagated.get(nid) ?? 0;
      const upstreamRatio = Math.min(1, upstream / 100);
      const upstreamCapacityMul = config.disableBackpressure ? 1 : Math.max(0.2, 1 - upstreamRatio * 0.5);
      const upstreamLatencyDelta = config.disableBackpressure ? 0 : upstreamRatio * 0.5;

      const rawLatency = s.latencyMultiplier + bp.latencyDelta + upstreamLatencyDelta;
      s.latencyMultiplier = config.disableLatencyCap ? rawLatency : Math.min(5, rawLatency);
      s.backpressureLevel = Math.max(bp.backpressureLevel, Math.floor(upstreamRatio * 10));

      const capMultiplier = (config.disableSaturationGuard ? 1 : bp.capacityMultiplier * upstreamCapacityMul) * correlatedCap;
      const alpha = config.positiveCongestionAlpha ?? 0;
      const pcfDivisor = 1 + alpha * congestionFactor;
      const effectiveCapacity = Math.max(
        1,
        Math.floor((config.baseProcessingCapacityPerTick * capMultiplier) / pcfDivisor),
      );

      let queue = s.inboundQueue;
      const dropsToApply = inCorrelatedWindow ? Math.max(1, Math.floor(config.correlatedFailureMultiplier)) : 1;
      for (let d = 0; d < dropsToApply; d++) {
        const dropSeed = inCorrelatedWindow ? (seed + ':burst:' + String(d)) : seed;
        const dropIdx = computeDropIndex(dropSeed, currentTick, nid, queue.length, config);
        if (dropIdx < 0) break;
        const { remaining } = applyDrop(queue, dropIdx);
        queue = remaining;
        s.dropCount++;
        this._updateMetricsDrop();
      }

      const fakeConfig = { ...config, baseProcessingCapacityPerTick: effectiveCapacity };
      const result = processInboundQueue(queue, fakeConfig, currentTick);
      s.inboundQueue = [...result.remaining];

      if (result.saturationEvent) s.saturationTicksConsecutive++;
      else s.saturationTicksConsecutive = 0;

      for (const q of result.processed) {
        deliverToNode(q.message.toNodeId, q.message);
        this._messagesDelivered++;
        const fromState = this._getState(q.message.fromNodeId);
        if (fromState.outboundQueueLength > 0) fromState.outboundQueueLength--;
      }
    }

    this._updateMetricsFromStates();
  }

  private _updateMetricsDrop(): void {
    const m = this._metrics;
    this._metrics = Object.freeze({
      ...m,
      totalDroppedMessages: m.totalDroppedMessages + 1,
    });
  }

  private _updateMetricsFromStates(): void {
    let maxQueue = 0;
    let maxLat = 0;
    let satCount = 0;
    let maxBp = 0;
    let totalDropped = 0;
    for (const s of this._stateByNode.values()) {
      if (s.inboundQueue.length > maxQueue) maxQueue = s.inboundQueue.length;
      if (s.latencyMultiplier > maxLat) maxLat = s.latencyMultiplier;
      if (s.saturationTicksConsecutive > 0) satCount++;
      if (s.backpressureLevel > maxBp) maxBp = s.backpressureLevel;
      totalDropped += s.dropCount;
    }
    this._metrics = Object.freeze({
      maxQueueSizeObserved: Math.max(this._metrics.maxQueueSizeObserved, maxQueue),
      totalDroppedMessages: totalDropped,
      maxLatencyMultiplier: Math.max(this._metrics.maxLatencyMultiplier, maxLat),
      saturationEventCount: this._metrics.saturationEventCount + satCount,
      maxBackpressureDepth: Math.max(this._metrics.maxBackpressureDepth, maxBp),
    });
  }

  getMetrics(): DegradationMetrics {
    return this._metrics;
  }

  getTotalEnqueued(): number {
    return this._totalEnqueued;
  }

  getMessagesDelivered(): number {
    return this._messagesDelivered;
  }
}
