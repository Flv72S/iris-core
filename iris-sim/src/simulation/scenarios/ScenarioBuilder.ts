/**
 * S-1 — Declarative scenario builder. Registers all events into scheduler; never executes immediately.
 */

import type { GlobalSimulationEngine } from '../engine/GlobalSimulationEngine.js';

export interface TrafficPattern {
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly payload: unknown;
  readonly messageType: string;
  readonly atTick: bigint;
}

interface ScheduledPartition {
  atTick: bigint;
  clusterA: string;
  clusterB: string;
  heal: boolean;
}

interface ScheduledCrash {
  atTick: bigint;
  nodeId: string;
  recover: boolean;
}

interface ScheduledByzantine {
  atTick: bigint;
  nodeId: string;
  behaviorType: string;
}

export class ScenarioBuilder {
  private readonly _engine: GlobalSimulationEngine;
  private readonly _clusters: { id: string; trustDomainId?: string }[] = [];
  private readonly _traffic: TrafficPattern[] = [];
  private readonly _partitions: ScheduledPartition[] = [];
  private readonly _crashes: ScheduledCrash[] = [];
  private readonly _byzantine: ScheduledByzantine[] = [];

  constructor(engine: GlobalSimulationEngine) {
    this._engine = engine;
  }

  createCluster(id: string, trustDomainId?: string): this {
    this._engine.createCluster(id, trustDomainId);
    this._clusters.push(trustDomainId === undefined ? { id } : { id, trustDomainId });
    return this;
  }

  connectClusters(): this {
    return this;
  }

  injectPartition(atTick: bigint, clusterA: string, clusterB: string): this {
    this._partitions.push({ atTick, clusterA, clusterB, heal: false });
    return this;
  }

  injectPartitionHeal(atTick: bigint, clusterA: string, clusterB: string): this {
    this._partitions.push({ atTick, clusterA, clusterB, heal: true });
    return this;
  }

  injectNodeCrash(atTick: bigint, nodeId: string): this {
    this._crashes.push({ atTick, nodeId, recover: false });
    return this;
  }

  injectNodeRecover(atTick: bigint, nodeId: string): this {
    this._crashes.push({ atTick, nodeId, recover: true });
    return this;
  }

  injectByzantine(atTick: bigint, nodeId: string, behaviorType: string): this {
    this._byzantine.push({ atTick, nodeId, behaviorType });
    return this;
  }

  scheduleTrafficPattern(fromNodeId: string, toNodeId: string, payload: unknown, messageType: string, atTick: bigint): this {
    this._traffic.push({ fromNodeId, toNodeId, payload, messageType, atTick });
    return this;
  }

  build(): void {
    const pm = this._engine.getPartitionManager();
    for (const p of this._partitions) {
      this._engine.scheduleEvent(p.atTick, 'scenario:partition:' + p.clusterA + ':' + p.clusterB + ':' + String(p.atTick), () => {
        if (pm) {
          if (p.heal) pm.heal(p.clusterA, p.clusterB);
          else pm.partition(p.clusterA, p.clusterB);
        }
      });
    }
    for (const c of this._crashes) {
      this._engine.scheduleEvent(c.atTick, 'scenario:crash:' + c.nodeId + ':' + String(c.atTick), () => {
        const node = this._engine.getNode(c.nodeId);
        if (node) {
          if (c.recover) node.recover();
          else node.crash();
        }
      });
    }
    for (const b of this._byzantine) {
      this._engine.scheduleEvent(b.atTick, 'scenario:byzantine:' + b.nodeId + ':' + String(b.atTick), () => {
        const node = this._engine.getNode(b.nodeId);
        if (node) node.injectByzantineBehavior();
      });
    }
    for (const t of this._traffic) {
      this._engine.scheduleEvent(t.atTick, 'scenario:traffic:' + t.fromNodeId + ':' + t.toNodeId + ':' + String(t.atTick), () => {
        const node = this._engine.getNode(t.fromNodeId);
        if (node && node.isAlive) {
          node.sendMessage(t.toNodeId, t.payload, t.messageType, this._engine.runtime.clock.currentTick);
        }
      });
    }
  }
}
