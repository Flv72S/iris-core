/**
 * Phase 13F — Trust Data Normalization Layer. Types.
 * All scores in range 0.0 → 1.0.
 */

/** Normalized metrics derived from a node behavior profile. */
export interface NormalizedBehaviorMetrics {
  readonly node_id: string;
  readonly normalized_activity_score: number;
  readonly normalized_consensus_score: number;
  readonly normalized_validation_score: number;
  readonly normalized_governance_score: number;
  readonly activity_baseline: number;
  readonly normalization_timestamp: number;
}
