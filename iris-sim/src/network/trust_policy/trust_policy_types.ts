/**
 * Phase 13L — Trust Policy Configuration System. Policy types.
 */

export interface AnomalyPolicy {
  readonly anomaly_score_threshold: number;
  readonly cluster_detection_threshold: number;
  readonly anomaly_window_size: number;
}

export interface ReputationPolicy {
  readonly minimum_reputation: number;
  readonly critical_reputation_threshold: number;
  readonly reputation_decay_rate: number;
}

export interface TrustGraphPolicy {
  readonly max_edges_per_node: number;
  readonly max_graph_nodes: number;
  readonly trust_propagation_depth: number;
  readonly trust_decay_factor: number;
}

export interface GovernancePolicy {
  readonly governance_trigger_threshold: number;
  readonly max_operations_per_cycle: number;
  readonly quarantine_threshold: number;
}

export interface RecoveryPolicy {
  readonly recovery_cooldown_blocks: number;
  readonly recovery_success_threshold: number;
}

export interface TrustPolicyConfig {
  readonly version: string;
  readonly timestamp: number;
  readonly anomaly_detection: AnomalyPolicy;
  readonly reputation: ReputationPolicy;
  readonly trust_graph: TrustGraphPolicy;
  readonly governance: GovernancePolicy;
  readonly recovery: RecoveryPolicy;
}
