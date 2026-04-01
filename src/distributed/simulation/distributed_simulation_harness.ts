import { stableStringify } from '../../logging/audit';
import type { ClusterState } from '../cluster_lifecycle_engine';
import type { ComplianceDecision } from '../cluster_compliance_engine';

import { buildMessage } from './message_types';
import { SimulatedNetwork, type NetworkConfig } from './simulated_network';
import { SimulatedNode } from './simulated_node';

export interface SimulationConfig {
  readonly nodeIds: readonly string[];
  readonly initialClusterState: ClusterState;
  readonly network: NetworkConfig;
}

export class DistributedSimulationHarness {
  readonly nodes: Readonly<Record<string, SimulatedNode>>;
  readonly network: SimulatedNetwork;
  private tickCounter: number;

  constructor(config: SimulationConfig) {
    const map: Record<string, SimulatedNode> = {};
    for (const id of [...config.nodeIds].sort()) {
      map[id] = new SimulatedNode(id, config.initialClusterState);
    }
    this.nodes = Object.freeze(map);
    this.network = new SimulatedNetwork(config.network);
    this.tickCounter = 0;
  }

  injectDecision(nodeId: string, decision: ComplianceDecision): void {
    const msg = buildMessage({
      type: 'DECISION',
      payload: decision,
      timestamp: decision.timestamp,
      originNodeId: nodeId,
    });
    this.network.broadcast(nodeId, Object.keys(this.nodes), msg);
    // origin node also applies locally (independent execution)
    this.nodes[nodeId]?.applyDecision(decision);
  }

  injectStateSync(nodeId: string): void {
    const snapshot = this.nodes[nodeId]?.snapshot();
    if (snapshot === undefined) return;
    const msg = buildMessage({
      type: 'STATE_SYNC',
      payload: snapshot,
      timestamp: snapshot.executionTimestamp ?? this.tickCounter,
      originNodeId: nodeId,
    });
    this.network.broadcast(nodeId, Object.keys(this.nodes), msg);
  }

  runTicks(n: number): void {
    for (let i = 0; i < n; i++) {
      this.tickCounter += 1;
      const due = this.network.tick();
      for (const env of due) {
        this.nodes[env.toNodeId]?.receiveMessage(env.message);
      }
      const ids = Object.keys(this.nodes).sort();
      for (const id of ids) {
        this.nodes[id]!.processNextMessage();
      }
    }
  }

  drain(maxTicks = 1000): void {
    let ticks = 0;
    while (ticks < maxTicks) {
      const pendingNode = Object.values(this.nodes).some((n) => n.hasPendingMessages());
      if (!this.network.hasPendingMessages() && !pendingNode) return;
      this.runTicks(1);
      ticks++;
    }
  }

  collectSnapshots(): Record<string, ClusterState> {
    const out: Record<string, ClusterState> = {};
    for (const id of Object.keys(this.nodes).sort()) {
      out[id] = this.nodes[id]!.snapshot();
    }
    return out;
  }

  snapshotsConverged(): boolean {
    const snaps = Object.values(this.collectSnapshots());
    if (snaps.length <= 1) return true;
    const base = stableStringify(snaps[0]);
    return snaps.every((s) => stableStringify(s) === base);
  }
}

export function runSimulation(config: SimulationConfig, ticks: number): DistributedSimulationHarness {
  const h = new DistributedSimulationHarness(config);
  h.runTicks(ticks);
  return h;
}
