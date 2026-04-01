/**
 * Phase 13I — Trust Explainability Engine. Explanation types.
 */

export interface ReputationExplanation {
  readonly node_id: string;
  readonly reputation_score: number;
  readonly contributing_factors: readonly string[];
  readonly positive_signals: readonly string[];
  readonly negative_signals: readonly string[];
}

export interface AnomalyExplanation {
  readonly node_id: string;
  readonly anomaly_types: readonly string[];
  readonly anomaly_count: number;
  readonly anomaly_sources: readonly string[];
}

export interface RecoveryExplanation {
  readonly node_id: string;
  readonly trust_state: string;
  readonly recovery_reason: string;
  readonly previous_state: string | null;
}

export interface TrustExplainabilityReport {
  readonly node_id: string;
  readonly reputation: ReputationExplanation | null;
  readonly anomaly: AnomalyExplanation | null;
  readonly recovery: RecoveryExplanation | null;
}

// --- Phase 13XX-F Trust Explainability Engine ---

export type ExplanationFactorType =
  | 'TRUST_DECAY'
  | 'ANOMALY_EVENT'
  | 'GOVERNANCE_DECISION'
  | 'TRUST_PROPAGATION';

export interface ExplanationFactor {
  readonly type: ExplanationFactorType;
  readonly description: string;
  readonly weight?: number | undefined;
}

export interface TrustExplanation {
  readonly node_id: string;
  readonly trust_score: number;
  readonly reputation_score: number;
  readonly anomaly_count: number;
  readonly governance_flags: readonly string[];
  readonly summary: string;
  readonly factors: readonly ExplanationFactor[];
}
