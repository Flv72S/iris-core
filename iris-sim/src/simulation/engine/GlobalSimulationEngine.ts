/**
 * S-1 — Global simulation engine. Owns S-0 runtime; all activity via scheduler.
 * S-6: optional degradation layer (queues, backpressure, deterministic drops).
 */

import { DeterministicRuntime } from '../../runtime/DeterministicRuntime.js';
import { createScheduledEvent } from '../../scheduler/ScheduledEvent.js';
import type { SimulationConfig } from './SimulationConfig.js';
import type { SimulationSnapshot, SimulationResult } from './SimulationTypes.js';
import { SimulatedCluster } from '../cluster/SimulatedCluster.js';
import { SimulatedNode } from '../node/SimulatedNode.js';
import type { SimulatedMessage } from '../node/NodeTypes.js';
import { DeterministicNetwork } from '../network/DeterministicNetwork.js';
import { DegradationEngine } from '../../degradation/core/DegradationEngine.js';
import { degradationConfigHashPayload } from '../../degradation/core/DegradationConfig.js';
import type { DegradationMetrics } from '../../degradation/metrics/DegradationMetrics.js';

export class SimulationEngineError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SimulationEngineError';
    Object.setPrototypeOf(this, SimulationEngineError.prototype);
  }
}

export class GlobalSimulationEngine {
  private readonly _config: SimulationConfig;
  readonly runtime: DeterministicRuntime;
  private readonly _clusters: Map<string, SimulatedCluster> = new Map();
  private readonly _nodeToCluster: Map<string, string> = new Map();
  private _network: DeterministicNetwork | null = null;
  private _degradation: DegradationEngine | null = null;
  private _initialized = false;
  private _deliveryInterceptor: ((nodeId: string, message: SimulatedMessage) => boolean) | null = null;
  private _dropByPartitionCallback: (() => void) | null = null;

  constructor(config: SimulationConfig) {
    this._config = config;
    this.runtime = new DeterministicRuntime();
  }

  initialize(seed: string): void {
    if (this._initialized) {
      throw new SimulationEngineError('ALREADY_INITIALIZED', 'Engine already initialized.');
    }
    this.runtime.initialize(seed);
    this._initialized = true;
  }

  createCluster(clusterId: string, trustDomainId?: string): SimulatedCluster {
    const c = new SimulatedCluster(clusterId, trustDomainId);
    this._clusters.set(clusterId, c);
    return c;
  }

  createNode(nodeId: string, clusterId: string, initialState?: unknown): SimulatedNode {
    const cluster = this._clusters.get(clusterId);
    if (!cluster) {
      throw new SimulationEngineError('CLUSTER_NOT_FOUND', 'Cluster ' + clusterId + ' not found.');
    }
    const node = new SimulatedNode(nodeId, clusterId, (initialState as Record<string, unknown>) ?? {});
    cluster.registerNode(node);
    this._nodeToCluster.set(nodeId, clusterId);
    return node;
  }

  ensureNetwork(): void {
    if (this._network) return;
    const self = this;
    const deliverToNode = (nodeId: string, message: SimulatedMessage): void => {
      if (self._deliveryInterceptor && !self._deliveryInterceptor(nodeId, message)) return;
      const node = self.getNode(nodeId);
      if (node) node.receiveMessage(message);
    };
    this._network = new DeterministicNetwork({
      baseLatency: this._config.baseLatency,
      latencyJitter: this._config.latencyJitter,
      getCurrentTick: () => self.runtime.clock.currentTick,
      rng: this.runtime.rng,
      scheduleDelivery: (tick, eventId, execute) => {
        self.runtime.scheduler.schedule(createScheduledEvent(eventId, tick, 0, execute));
      },
      deliverToNode,
      ...(this._dropByPartitionCallback ? { onDropByPartition: this._dropByPartitionCallback } : {}),
    });
    const useDegradation = this._config.degradationEnabled && this._config.degradationConfig;
    if (useDegradation && this._config.degradationConfig) {
      const degConfig = this._config.degradationConfig;
      this._degradation = new DegradationEngine({
        config: degConfig,
        seed: this._config.deterministicSeed,
        baseLatency: this._config.baseLatency,
        getCurrentTick: () => self.runtime.clock.currentTick,
        getPartitioned: (from, to) => self._network?.getPartitionManager().isPartitioned(from, to) ?? false,
        deliverToNode,
      });
      this.runtime.setOnBeforeTick((tick) => this._degradation!.tick(tick));
      // Include degradation parameters into deterministic execution hash (trace) without affecting behavior.
      this.runtime.scheduler.schedule(
        createScheduledEvent(
          'sim:degradation:cfg:' + degradationConfigHashPayload(degConfig),
          0n,
          -999,
          () => {},
        ),
      );
      for (const cluster of this._clusters.values()) {
        for (const node of cluster.nodes.values()) {
          node.setSendFn((msg: SimulatedMessage) => {
            const fromCluster = self._nodeToCluster.get(msg.fromNodeId);
            const toCluster = self._nodeToCluster.get(msg.toNodeId);
            if (!fromCluster || !toCluster) return;
            if (self._network?.getPartitionManager().isPartitioned(fromCluster, toCluster)) return;
            self._degradation!.enqueueMessage(msg, fromCluster, toCluster);
          });
        }
      }
    } else {
      for (const cluster of this._clusters.values()) {
        for (const node of cluster.nodes.values()) {
          node.setSendFn((msg: SimulatedMessage) => {
            const fromCluster = self._nodeToCluster.get(msg.fromNodeId);
            const toCluster = self._nodeToCluster.get(msg.toNodeId);
            if (fromCluster && toCluster && self._network) {
              self._network.submitMessage(msg, fromCluster, toCluster);
            }
          });
        }
      }
    }
  }

  setDeliveryInterceptor(fn: ((nodeId: string, message: SimulatedMessage) => boolean) | null): void {
    this._deliveryInterceptor = fn;
  }

  setDropByPartitionCallback(fn: (() => void) | null): void {
    this._dropByPartitionCallback = fn;
  }

  scheduleEvent(tick: bigint, eventId: string, execute: () => void, priority: number = 0): void {
    this.runtime.scheduler.schedule(createScheduledEvent(eventId, tick, priority, execute));
  }

  getNode(nodeId: string): SimulatedNode | undefined {
    const clusterId = this._nodeToCluster.get(nodeId);
    if (!clusterId) return undefined;
    return this._clusters.get(clusterId)?.getNode(nodeId);
  }

  getCluster(clusterId: string): SimulatedCluster | undefined {
    return this._clusters.get(clusterId);
  }

  getClusterIds(): string[] {
    return [...this._clusters.keys()];
  }

  getPartitionManager(): ReturnType<DeterministicNetwork['getPartitionManager']> | null {
    return this._network?.getPartitionManager() ?? null;
  }

  getNetwork(): DeterministicNetwork | null {
    return this._network;
  }

  run(): void {
    this.ensureNetwork();
    if (!this.runtime.isStarted) this.runtime.start();
    this.runtime.runUntil(this._config.maxTicks);
  }

  step(): void {
    this.ensureNetwork();
    if (!this.runtime.isStarted) this.runtime.start();
    this.runtime.step();
  }

  runUntil(tick: bigint): void {
    this.ensureNetwork();
    if (!this.runtime.isStarted) this.runtime.start();
    this.runtime.runUntil(tick);
  }

  getExecutionHash(): string {
    return this.runtime.getExecutionHash();
  }

  getResult(): SimulationResult {
    const net = this._network;
    const degradation = this._degradation;
    const messagesDelivered = degradation
      ? degradation.getMessagesDelivered()
      : (net?.messagesDelivered ?? 0);
    const messagesDropped = net?.messagesDropped ?? 0;
    return Object.freeze({
      finalTick: this.runtime.clock.currentTick,
      executionHash: this.runtime.getExecutionHash(),
      messagesDelivered,
      messagesDropped,
    });
  }

  /** S-6: degradation metrics when degradation layer is enabled; undefined otherwise. */
  getDegradationMetrics(): DegradationMetrics | undefined {
    return this._degradation?.getMetrics();
  }

  snapshot(): SimulationSnapshot {
    this.ensureNetwork();
    const clusterData = [...this._clusters.entries()].map(([id, c]) => ({ clusterId: id, metrics: c.getMetrics() }));
    return Object.freeze({
      tick: String(this.runtime.clock.currentTick),
      clusters: clusterData,
      network: { messagesDelivered: this._network?.messagesDelivered ?? 0, messagesDropped: this._network?.messagesDropped ?? 0 },
      runtimeSnapshot: this.runtime.snapshot(),
    });
  }

  restore(snap: SimulationSnapshot): void {
    this.runtime.restore(snap.runtimeSnapshot as Parameters<DeterministicRuntime['restore']>[0]);
  }

  shutdown(): void {
    this.runtime.shutdown();
  }
}
