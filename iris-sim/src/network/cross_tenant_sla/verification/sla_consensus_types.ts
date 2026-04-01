/**
 * Phase 11C.3 / 11C.3.1 — SLA Consensus Verification. Types.
 */

export type SLAConsensusVerificationStatus = 'OK' | 'WARNING' | 'ERROR';

export interface SLAConsensusCheckResult {
  readonly consensus_hash: string;
  readonly consensus_nodes: readonly string[];
  readonly sla_nodes: readonly string[];
  readonly nodes_missing_sla: readonly string[];
  readonly nodes_outside_consensus: readonly string[];
  readonly mismatch_ratio: number;
  readonly verification_status: SLAConsensusVerificationStatus;
}

export interface SLAConsensusDiagnostics {
  readonly consensus_node_count: number;
  readonly sla_node_count: number;
  readonly mismatch_count: number;
}
