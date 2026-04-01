/**
 * Phase 13H — Network Trust Observatory. Telemetry types.
 */

export interface NetworkHealthReport {
  readonly timestamp: number;
  readonly total_nodes: number;
  readonly average_reputation: number;
  readonly trust_concentration_index: number;
  readonly anomaly_rate: number;
  readonly recovery_activity_rate: number;
  readonly governance_event_rate: number;
}

export interface TrustDistributionReport {
  readonly timestamp: number;
  readonly reputation_distribution: readonly number[];
  readonly min_reputation: number;
  readonly max_reputation: number;
  readonly median_reputation: number;
  readonly high_trust_nodes: number;
  readonly low_trust_nodes: number;
}

export interface AnomalyActivityReport {
  readonly timestamp: number;
  readonly total_anomalies: number;
  readonly anomalies_by_type: Map<string, number>;
  readonly affected_nodes: number;
}
