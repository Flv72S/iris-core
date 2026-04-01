/**
 * S-1 — Deterministic network type definitions.
 */

import type { SimulatedMessage } from '../node/NodeTypes.js';

export interface PendingDelivery {
  readonly tickDelivery: bigint;
  readonly message: SimulatedMessage;
  readonly fromClusterId: string;
  readonly toClusterId: string;
}

export interface LatencyModel {
  readonly baseLatency: number;
  readonly jitterMax: number;
}

export interface PartitionSpec {
  readonly clusterA: string;
  readonly clusterB: string;
  readonly active: boolean;
}
