/**
 * S-1 — Logical IRIS cluster. Nodes register here; inter-cluster traffic via DeterministicNetwork.
 */

import type { SimulatedNode } from '../node/SimulatedNode.js';
import type { ClusterMetrics } from './ClusterTypes.js';

export class SimulatedCluster {
  readonly clusterId: string;
  readonly trustDomainId: string;
  readonly nodes: Map<string, SimulatedNode> = new Map();
  readonly governanceState: unknown = Object.freeze({});

  constructor(clusterId: string, trustDomainId?: string) {
    this.clusterId = clusterId;
    this.trustDomainId = trustDomainId ?? clusterId;
  }

  registerNode(node: SimulatedNode): void {
    if (node.clusterId !== this.clusterId) return;
    this.nodes.set(node.nodeId, node);
  }

  getNode(nodeId: string): SimulatedNode | undefined {
    return this.nodes.get(nodeId);
  }

  getMetrics(): ClusterMetrics {
    let aliveCount = 0;
    for (const n of this.nodes.values()) {
      if (n.isAlive) aliveCount++;
    }
    return Object.freeze({ nodeCount: this.nodes.size, aliveCount });
  }
}
