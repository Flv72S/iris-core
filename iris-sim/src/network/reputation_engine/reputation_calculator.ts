/**
 * Phase 13A — Node Reputation Engine. Weighted score calculation.
 * Deterministic; result clamped 0 ≤ score ≤ 1.
 */

import type { NormalizedBehaviorMetrics } from '../trust_normalization/index.js';
import type { ReputationWeights } from './reputation_types.js';

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/**
 * Compute reputation score from normalized metrics and weights.
 */
export function computeReputationScore(
  metrics: NormalizedBehaviorMetrics,
  weights: ReputationWeights
): number {
  const score =
    metrics.normalized_activity_score * weights.activity_weight +
    metrics.normalized_consensus_score * weights.consensus_weight +
    metrics.normalized_validation_score * weights.validation_weight +
    metrics.normalized_governance_score * weights.governance_weight;
  return clamp01(score);
}
