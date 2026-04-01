/**
 * Phase 13D — Anomaly Detection Engine. Types.
 */

export enum AnomalyType {
  ACTIVITY_OUTLIER = 'ACTIVITY_OUTLIER',
  CONSENSUS_MANIPULATION = 'CONSENSUS_MANIPULATION',
  TRUST_COLLUSION_CLUSTER = 'TRUST_COLLUSION_CLUSTER',
  SYBIL_INDICATOR = 'SYBIL_INDICATOR',
}

/** Single detected anomaly; score 0 = weak, 1 = strong. */
export interface AnomalyReport {
  readonly node_id: string;
  readonly anomaly_type: AnomalyType;
  readonly anomaly_score: number;
  readonly detection_timestamp: number;
}

// --- Phase 13XX-D Multi-Layer Rule-Based Anomaly Detection ---

/** Rule-based anomaly categories (deterministic, no ML). */
export type RuleAnomalyType =
  | 'TRUST_SPIKE'
  | 'TRUST_COLLAPSE'
  | 'TRUST_LOOP'
  | 'BEHAVIORAL_DEVIATION'
  | 'SUSPICIOUS_PROPAGATION'
  | 'IDENTITY_INCONSISTENCY';

/** Severity determines governance reactions. */
export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
