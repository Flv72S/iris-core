/**
 * S-1 — Deterministic network fabric. Message delivery at currentTick + latency; partitions; traceable.
 */

import type { SimulatedMessage } from '../node/NodeTypes.js';
import { NetworkPartitionManager } from './NetworkPartitionManager.js';

export type ScheduleDeliveryFn = (tick: bigint, eventId: string, execute: () => void) => void;
export type DeliverToNodeFn = (nodeId: string, message: SimulatedMessage) => void;

export interface DeterministicNetworkConfig {
  readonly baseLatency: number;
  readonly latencyJitter: number;
  readonly getCurrentTick: () => bigint;
  readonly rng: { nextInt: (max: number) => number };
  readonly scheduleDelivery: ScheduleDeliveryFn;
  readonly deliverToNode: DeliverToNodeFn;
  readonly onDropByPartition?: () => void;
}

export class DeterministicNetwork {
  private readonly _config: DeterministicNetworkConfig;
  private readonly _partitionManager: NetworkPartitionManager;
  private _messagesDelivered: number = 0;
  private _messagesDropped: number = 0;

  constructor(config: DeterministicNetworkConfig) {
    this._config = config;
    this._partitionManager = new NetworkPartitionManager();
  }

  getPartitionManager(): NetworkPartitionManager {
    return this._partitionManager;
  }

  get messagesDelivered(): number {
    return this._messagesDelivered;
  }

  get messagesDropped(): number {
    return this._messagesDropped;
  }

  submitMessage(message: SimulatedMessage, fromClusterId: string, toClusterId: string): void {
    if (this._partitionManager.isPartitioned(fromClusterId, toClusterId)) {
      this._messagesDropped++;
      this._config.onDropByPartition?.();
      return;
    }
    const tick = this._config.getCurrentTick();
    const jitter = this._config.latencyJitter > 0 ? this._config.rng.nextInt(2 * this._config.latencyJitter + 1) - this._config.latencyJitter : 0;
    const latency = Math.max(0, this._config.baseLatency + jitter);
    const tickDelivery = tick + BigInt(latency);
    const eventId = 'sim:deliver:' + message.fromNodeId + ':' + message.toNodeId + ':' + message.messageType + ':' + String(message.tickSent) + ':' + String(tickDelivery) + ':' + message.messageId;
    const fromCluster = fromClusterId;
    const toCluster = toClusterId;
    this._config.scheduleDelivery(tickDelivery, eventId, () => {
      if (this._partitionManager.isPartitioned(fromCluster, toCluster)) {
        this._messagesDropped++;
        this._config.onDropByPartition?.();
        return;
      }
      this._config.deliverToNode(message.toNodeId, message);
      this._messagesDelivered++;
    });
  }

  resetCounters(): void {
    this._messagesDelivered = 0;
    this._messagesDropped = 0;
  }
}
