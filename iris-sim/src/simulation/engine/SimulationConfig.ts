/**
 * S-1 — Simulation configuration. Fully serializable.
 * S-6: optional degradation (deterministic emergent instability).
 */

import {
  type DegradationConfig,
  createDegradationConfig,
} from '../../degradation/core/DegradationConfig.js';

export interface SimulationConfig {
  readonly numberOfClusters: number;
  readonly nodesPerCluster: number;
  readonly baseLatency: number;
  readonly latencyJitter: number;
  readonly allowByzantine: boolean;
  readonly allowPartitions: boolean;
  readonly maxTicks: bigint;
  readonly deterministicSeed: string;
  /** S-6: when true and degradationConfig set, use degradation layer (queues, drops, latency). */
  readonly degradationEnabled: boolean;
  /** S-6: config for degradation engine; when null or degradationEnabled false, pre-S-6 behavior. */
  readonly degradationConfig: DegradationConfig | null;
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = Object.freeze({
  numberOfClusters: 1,
  nodesPerCluster: 1,
  baseLatency: 1,
  latencyJitter: 0,
  allowByzantine: false,
  allowPartitions: false,
  maxTicks: 1000n,
  deterministicSeed: 'default-seed',
  degradationEnabled: true,
  degradationConfig: null,
});

export function createSimulationConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  const base = { ...DEFAULT_SIMULATION_CONFIG, ...overrides };
  if (base.degradationEnabled && !base.degradationConfig) {
    return Object.freeze({ ...base, degradationConfig: createDegradationConfig() });
  }
  return Object.freeze(base);
}
