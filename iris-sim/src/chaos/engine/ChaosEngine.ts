/**
 * S-2 — Chaos engine. Attaches to GlobalSimulationEngine; all chaos via scheduler.
 */

import { createHash } from 'crypto';
import type { GlobalSimulationEngine } from '../../simulation/engine/GlobalSimulationEngine.js';
import type { ChaosConfig } from './ChaosConfig.js';
import type { ChaosLayerSnapshot } from './ChaosTypes.js';
import { InvariantMonitor } from '../monitoring/InvariantMonitor.js';
import { SoftInvariantType } from '../monitoring/InvariantTypes.js';
import { SystemMetricsCollector } from '../monitoring/SystemMetricsCollector.js';
import { createChaosReport } from '../monitoring/ChaosReport.js';
import type { ScheduledAttack } from './ChaosTypes.js';
import { applyScheduledAttack } from '../policies/ChaosPolicyEngine.js';

export class ChaosEngineError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ChaosEngineError';
    Object.setPrototypeOf(this, ChaosEngineError.prototype);
  }
}

export class ChaosEngine {
  private readonly _engine: GlobalSimulationEngine;
  private readonly _config: ChaosConfig;
  private readonly _invariantMonitor: InvariantMonitor;
  private readonly _metricsCollector: SystemMetricsCollector;
  private _attackCount = 0;
  private _attackSummary: { kind: string; count: number }[] = [];
  private _initialized = false;

  constructor(simulationEngine: GlobalSimulationEngine, config: ChaosConfig) {
    this._engine = simulationEngine;
    this._config = config;
    this._invariantMonitor = new InvariantMonitor(config.invariantStrictMode);
    this._metricsCollector = new SystemMetricsCollector();
  }

  initialize(_seed: string): void {
    if (this._initialized) throw new ChaosEngineError('ALREADY_INITIALIZED', 'Chaos engine already initialized.');
    this._invariantMonitor.reset();
    this._metricsCollector.reset();
    this._attackCount = 0;
    this._attackSummary = [];
    this._initialized = true;
  }

  injectAttack(attack: ScheduledAttack): void {
    this._engine.ensureNetwork();
    const rng = this._engine.runtime.rng;
    applyScheduledAttack(this._engine, attack, this._config, rng, 'chaos');
    this._attackCount++;
    const existing = this._attackSummary.find((x) => x.kind === attack.kind);
    if (existing) existing.count++;
    else this._attackSummary.push({ kind: attack.kind, count: 1 });
  }

  run(): void {
    this._engine.setDropByPartitionCallback(() => {
      this._invariantMonitor.recordSoftEvent(SoftInvariantType.DELIVERY_DROPPED_BY_PARTITION);
    });
    this._engine.ensureNetwork();
    this._engine.setDeliveryInterceptor((nodeId, message) => {
      return this._invariantMonitor.checkDelivery(nodeId, message, (id) => this._engine.getNode(id));
    });
    this._engine.run();
    this._collectMetrics();
    this._engine.setDeliveryInterceptor(null);
    this._engine.setDropByPartitionCallback(null);
  }

  private _collectMetrics(): void {
    const net = this._engine.getNetwork();
    const degradation = this._engine.getDegradationMetrics();
    if (net) {
      const delivered = this._engine.getResult().messagesDelivered;
      const dropped = net.messagesDropped + (degradation?.totalDroppedMessages ?? 0);
      this._metricsCollector.setNetworkStats(delivered, dropped);
    }
    let active = 0;
    let crashed = 0;
    for (const cid of this._engine.getClusterIds()) {
      const c = this._engine.getCluster(cid);
      if (c) {
        const m = c.getMetrics();
        active += m.aliveCount;
        crashed += m.nodeCount - m.aliveCount;
      }
    }
    this._metricsCollector.setNodeCounts(active, crashed);
    const pm = this._engine.getPartitionManager();
    this._metricsCollector.setPartitionCount(pm ? pm.getPartitions().length : 0);
    this._metricsCollector.setQueueDepth(this._engine.runtime.scheduler.size);
  }

  snapshot(): ChaosLayerSnapshot {
    this._collectMetrics();
    const tick = this._engine.runtime.clock.currentTick;
    return Object.freeze({
      tick: String(tick),
      attackCount: this._attackCount,
      hardViolationCount: this._invariantMonitor.hardViolationCount,
      softEventCount: this._invariantMonitor.softEventCount,
      invariantMonitorSerialized: this._invariantMonitor.serialize(),
      metricsSnapshot: this._metricsCollector.snapshot(tick),
    });
  }

  restore(snap: ChaosLayerSnapshot): void {
    const serialized = snap.invariantMonitorSerialized as Parameters<InvariantMonitor['deserialize']>[0];
    if (serialized) this._invariantMonitor.deserialize(serialized);
  }

  getChaosHash(): string {
    const snap = this.snapshot();
    const payload = JSON.stringify({
      attackCount: snap.attackCount,
      hardViolationCount: snap.hardViolationCount,
      metrics: snap.metricsSnapshot,
    });
    return createHash('sha256').update(payload, 'utf8').digest('hex');
  }

  getCombinedHash(): string {
    const simHash = this._engine.getExecutionHash();
    const chaosHash = this.getChaosHash();
    return createHash('sha256').update(simHash + chaosHash, 'utf8').digest('hex');
  }

  generateReport(): ReturnType<typeof createChaosReport> {
    this._collectMetrics();
    const tick = this._engine.runtime.clock.currentTick;
    const metrics = this._metricsCollector.snapshot(tick);
    const chaosHash = this.getChaosHash();
    const simHash = this._engine.getExecutionHash();
    const combined = this.getCombinedHash();
    return createChaosReport(
      this._attackSummary,
      this._invariantMonitor.getHardBreakdown(),
      this._invariantMonitor.getSoftBreakdown(),
      metrics,
      {
        maxQueueDepth: metrics.maxQueueDepth,
        maxCrashedNodes: metrics.crashedNodes,
        maxPartitionCount: metrics.partitionCount,
      },
      chaosHash,
      simHash,
      combined,
    );
  }

  get hardViolationCount(): number {
    return this._invariantMonitor.hardViolationCount;
  }

  get softEventCount(): number {
    return this._invariantMonitor.softEventCount;
  }
}
