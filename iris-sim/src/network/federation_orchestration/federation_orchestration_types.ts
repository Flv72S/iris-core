/**
 * Phase 11H — Federation Coordination & Consensus Orchestration. Types.
 * All objects are immutable.
 */

export type FederationExecutionStage =
  | 'TRUST_EVALUATION'
  | 'CERTIFICATION'
  | 'PREDICTIVE_ANALYSIS'
  | 'AUDIT'
  | 'CONSENSUS_FINALIZATION';

export type FederationStageStatus = 'PENDING' | 'RUNNING' | 'COMPLETED';

export interface FederationStageSnapshot {
  readonly stage: FederationExecutionStage;
  readonly status: FederationStageStatus;
  readonly timestamp: number;
}

/** RiskLevel from predictive governance layer (LOW | MODERATE | HIGH | SYSTEMIC). */
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'SYSTEMIC';

export interface FederationConsensusState {
  readonly trust_nodes: number;
  readonly certified_nodes: number;
  readonly predictive_signals: number;
  readonly audit_passed_nodes: number;
  readonly systemic_risk_level: RiskLevel;
}

export interface FederationConsensusSnapshot {
  readonly timeline: readonly FederationStageSnapshot[];
  readonly consensus_state: FederationConsensusState;
  readonly finalized: boolean;
  readonly timestamp: number;
}

export interface FederationNotification {
  readonly stage: FederationExecutionStage;
  readonly message: string;
  readonly timestamp: number;
}
