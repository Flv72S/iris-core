/**
 * Phase 13A — Node Reputation Engine. Orchestrates reputation updates.
 */

import type { NormalizedBehaviorMetrics } from '../trust_normalization/index.js';
import type { NodeReputationProfile, ReputationWeights } from './reputation_types.js';
import { computeReputationScore } from './reputation_calculator.js';
import { applyReputationDecay } from './reputation_decay_engine.js';

const DEFAULT_DECAY_FACTOR = 0.98;

/**
 * Compute base score, apply decay if inactive, return updated profile.
 */
export function computeNodeReputation(
  metrics: NormalizedBehaviorMetrics,
  weights: ReputationWeights,
  previous_profile: NodeReputationProfile | undefined,
  timestamp: number
): NodeReputationProfile {
  const baseScore = computeReputationScore(metrics, weights);
  const decayedScore = applyReputationDecay(
    baseScore,
    metrics.normalization_timestamp,
    timestamp,
    DEFAULT_DECAY_FACTOR
  );
  return Object.freeze({
    node_id: metrics.node_id,
    reputation_score: decayedScore,
    ...(previous_profile !== undefined && { previous_score: previous_profile.reputation_score }),
    last_updated: timestamp,
  });
}

/**
 * Compute reputations for multiple nodes. Deterministic order by node_id.
 */
export function computeReputationBatch(
  metrics_list: readonly NormalizedBehaviorMetrics[],
  weights: ReputationWeights,
  timestamp: number
): NodeReputationProfile[] {
  const sorted = [...metrics_list].sort((a, b) => a.node_id.localeCompare(b.node_id));
  return sorted.map((m) => computeNodeReputation(m, weights, undefined, timestamp));
}
