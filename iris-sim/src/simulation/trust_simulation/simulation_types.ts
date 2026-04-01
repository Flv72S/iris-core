/**
 * Trust Simulation Test Framework. Types.
 */

export enum SimulatedNodeType {
  HONEST_NODE = 'HONEST_NODE',
  PASSIVE_NODE = 'PASSIVE_NODE',
  VALIDATOR_NODE = 'VALIDATOR_NODE',
  HIGH_ACTIVITY_NODE = 'HIGH_ACTIVITY_NODE',
  ANOMALOUS_NODE = 'ANOMALOUS_NODE',
}

export interface SimulatedNode {
  readonly node_id: string;
  readonly node_type: SimulatedNodeType;
}

export interface TrustSimulationConfig {
  readonly node_count: number;
  readonly simulation_rounds: number;
  readonly timestamp_start: number;
  readonly timestamp_step: number;
  readonly seed?: number;
}

export interface TrustSimulationResult {
  readonly reputation_distribution: number[];
  readonly baseline_activity: number;
  readonly node_reputations: Map<string, number>;
}
