/**
 * Trust Simulation Test Framework. Runs full pipeline and collects results.
 */

import { computeActivityBaseline, normalizeBehaviorProfiles } from '../../network/trust_normalization/index.js';
import {
  computeReputationBatch,
  DEFAULT_REPUTATION_WEIGHTS,
} from '../../network/reputation_engine/index.js';
import { generateNetwork } from './network_simulator.js';
import { generateBehaviorProfile } from './node_behavior_generator.js';
import type { TrustSimulationConfig, TrustSimulationResult } from './simulation_types.js';

/**
 * Run the trust simulation: generate network, run rounds, normalize, compute reputations.
 */
export function runTrustSimulation(config: TrustSimulationConfig): TrustSimulationResult {
  const { node_count, simulation_rounds, timestamp_start, timestamp_step } = config;
  const seed = config.seed ?? 0;

  const nodes = generateNetwork(node_count);
  let lastBaseline = 0;
  const reputationByNode = new Map<string, number>();

  for (let round = 0; round < simulation_rounds; round++) {
    const timestamp = timestamp_start + round * timestamp_step;
    const profiles = nodes.map((node) => generateBehaviorProfile(node, timestamp, seed));
    lastBaseline = computeActivityBaseline(profiles);
    const normalized = normalizeBehaviorProfiles(profiles, timestamp);
    const reputations = computeReputationBatch(normalized, DEFAULT_REPUTATION_WEIGHTS, timestamp);
    reputationByNode.clear();
    for (const r of reputations) {
      reputationByNode.set(r.node_id, r.reputation_score);
    }
  }

  const reputation_distribution = [...reputationByNode.values()].sort((a, b) => a - b);
  return Object.freeze({
    reputation_distribution,
    baseline_activity: lastBaseline,
    node_reputations: new Map(reputationByNode),
  });
}
