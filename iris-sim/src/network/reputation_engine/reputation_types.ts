/**
 * Phase 13A — Node Reputation Engine. Types.
 * Score range 0.0 (untrusted) → 1.0 (highly trusted).
 */

/** Reputation state of a node. */
export interface NodeReputationProfile {
  readonly node_id: string;
  readonly reputation_score: number;
  readonly previous_score?: number;
  readonly last_updated: number;
}

/** Weighting factors for normalized metrics; default sum = 1.0. */
export interface ReputationWeights {
  readonly activity_weight: number;
  readonly consensus_weight: number;
  readonly validation_weight: number;
  readonly governance_weight: number;
}

/** Default weights (sum = 1.0). */
export const DEFAULT_REPUTATION_WEIGHTS: ReputationWeights = Object.freeze({
  activity_weight: 0.25,
  consensus_weight: 0.3,
  validation_weight: 0.25,
  governance_weight: 0.2,
});
