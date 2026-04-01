/**
 * S-2 Soft Scalability — Test matrix configuration. Deterministic scenarios only.
 */

import type { SimulationConfig } from '../../simulation/engine/SimulationConfig.js';
import type { ChaosConfig } from '../engine/ChaosConfig.js';

export const ExpectedRelation = {
  BASELINE_REFERENCE: 'BASELINE_REFERENCE',
  GREATER_THAN_BASELINE: 'GREATER_THAN_BASELINE',
} as const;

export type ExpectedRelation = (typeof ExpectedRelation)[keyof typeof ExpectedRelation];

export interface ChaosScenarioParams {
  readonly crashStormIntensityPercent: number;
  readonly byzantineSwarmPercent: number;
  readonly floodMessagesPerPair: number;
  readonly recoveryStormIntensityPercent: number;
}

export interface SoftScalabilityTestConfig {
  readonly name: string;
  readonly simulationConfig: SimulationConfig;
  readonly chaosConfig: Partial<ChaosConfig>;
  readonly chaosScenarioParams: ChaosScenarioParams;
  readonly messageCount: number;
  readonly expectedRelation: ExpectedRelation;
  readonly checkDistributionChange: boolean;
}

const SEED = 's2-soft-scalability-seed';

const defaultScenarioParams: ChaosScenarioParams = Object.freeze({
  crashStormIntensityPercent: 10,
  byzantineSwarmPercent: 5,
  floodMessagesPerPair: 20,
  recoveryStormIntensityPercent: 15,
});

export function getBaselineTestConfig(): SoftScalabilityTestConfig {
  const simulationConfig: SimulationConfig = Object.freeze({
    numberOfClusters: 10,
    nodesPerCluster: 50,
    baseLatency: 1,
    latencyJitter: 0,
    allowByzantine: true,
    allowPartitions: true,
    maxTicks: 2000n,
    deterministicSeed: SEED,
    degradationEnabled: false,
    degradationConfig: null,
  });
  return Object.freeze({
    name: 'TEST 1 — BASELINE',
    simulationConfig,
    chaosConfig: Object.freeze({ attackSeed: SEED, invariantStrictMode: true }),
    chaosScenarioParams: defaultScenarioParams,
    messageCount: 2000,
    expectedRelation: ExpectedRelation.BASELINE_REFERENCE,
    checkDistributionChange: false,
  });
}

export function getNodeScalingTestConfig(): SoftScalabilityTestConfig {
  const simulationConfig: SimulationConfig = Object.freeze({
    numberOfClusters: 10,
    nodesPerCluster: 100,
    baseLatency: 1,
    latencyJitter: 0,
    allowByzantine: true,
    allowPartitions: true,
    maxTicks: 2000n,
    deterministicSeed: SEED,
    degradationEnabled: false,
    degradationConfig: null,
  });
  return Object.freeze({
    name: 'TEST 2 — NODE SCALING',
    simulationConfig,
    chaosConfig: Object.freeze({ attackSeed: SEED, invariantStrictMode: true }),
    chaosScenarioParams: defaultScenarioParams,
    messageCount: 2000,
    expectedRelation: ExpectedRelation.GREATER_THAN_BASELINE,
    checkDistributionChange: false,
  });
}

export function getIntensityScalingTestConfig(): SoftScalabilityTestConfig {
  const simulationConfig: SimulationConfig = Object.freeze({
    numberOfClusters: 10,
    nodesPerCluster: 50,
    baseLatency: 1,
    latencyJitter: 0,
    allowByzantine: true,
    allowPartitions: true,
    maxTicks: 2000n,
    deterministicSeed: SEED,
    degradationEnabled: false,
    degradationConfig: null,
  });
  return Object.freeze({
    name: 'TEST 3 — INTENSITY SCALING',
    simulationConfig,
    chaosConfig: Object.freeze({ attackSeed: SEED, invariantStrictMode: true }),
    chaosScenarioParams: Object.freeze({
      crashStormIntensityPercent: 20,
      byzantineSwarmPercent: 10,
      floodMessagesPerPair: 40,
      recoveryStormIntensityPercent: 15,
    }),
    messageCount: 2000,
    expectedRelation: ExpectedRelation.GREATER_THAN_BASELINE,
    checkDistributionChange: true,
  });
}

export function getDurationScalingTestConfig(): SoftScalabilityTestConfig {
  const simulationConfig: SimulationConfig = Object.freeze({
    numberOfClusters: 10,
    nodesPerCluster: 50,
    baseLatency: 1,
    latencyJitter: 0,
    allowByzantine: true,
    allowPartitions: true,
    maxTicks: 4000n,
    deterministicSeed: SEED,
    degradationEnabled: false,
    degradationConfig: null,
  });
  return Object.freeze({
    name: 'TEST 4 — DURATION SCALING',
    simulationConfig,
    chaosConfig: Object.freeze({ attackSeed: SEED, invariantStrictMode: true }),
    chaosScenarioParams: defaultScenarioParams,
    messageCount: 4000,
    expectedRelation: ExpectedRelation.GREATER_THAN_BASELINE,
    checkDistributionChange: false,
  });
}

export function getAllTestConfigs(): SoftScalabilityTestConfig[] {
  return [
    getBaselineTestConfig(),
    getNodeScalingTestConfig(),
    getIntensityScalingTestConfig(),
    getDurationScalingTestConfig(),
  ];
}
