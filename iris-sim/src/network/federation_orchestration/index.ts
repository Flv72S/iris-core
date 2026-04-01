/**
 * Phase 11H — Federation Coordination & Consensus Orchestration.
 * Read-only control plane; does not mutate trust, certificates, proofs, or audit.
 */

export type {
  FederationExecutionStage,
  FederationStageSnapshot,
  FederationConsensusState,
  FederationConsensusSnapshot,
  FederationNotification,
  RiskLevel,
} from './federation_orchestration_types.js';
export { GOVERNANCE_EXECUTION_ORDER, getNextExecutionStage } from './governance_execution_stage.js';
export { runFederationConsensusOrchestration } from './federation_execution_coordinator.js';
