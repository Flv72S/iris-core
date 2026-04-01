/**
 * Trust Simulation Test Framework.
 * Behavior Monitoring → Trust Normalization → Reputation Engine.
 */

export {
  SimulatedNodeType,
  type SimulatedNode,
  type TrustSimulationConfig,
  type TrustSimulationResult,
} from './simulation_types.js';
export { generateBehaviorProfile } from './node_behavior_generator.js';
export { generateNetwork } from './network_simulator.js';
export { runTrustSimulation } from './simulation_runner.js';
