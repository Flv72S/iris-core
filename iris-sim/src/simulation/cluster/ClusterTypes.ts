/**
 * S-1 — Simulated cluster type definitions.
 */

import type { SimulatedNode } from '../node/SimulatedNode.js';

export interface ClusterMetrics {
  readonly nodeCount: number;
  readonly aliveCount: number;
}

export interface SimulatedClusterHandle {
  readonly clusterId: string;
  readonly trustDomainId: string;
  readonly nodes: Map<string, SimulatedNode>;
  getNode(nodeId: string): SimulatedNode | undefined;
  getMetrics(): ClusterMetrics;
}
