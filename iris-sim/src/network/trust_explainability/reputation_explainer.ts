/**
 * Phase 13I — Trust Explainability Engine. Reputation explanation.
 */

import type { NodeReputationProfile } from '../reputation_engine/index.js';
import type { ReputationExplanation } from './explainability_types.js';

const HIGH_REPUTATION_THRESHOLD = 0.6;
const LOW_REPUTATION_THRESHOLD = 0.4;

/**
 * Derive structured explanation from reputation profile. Deterministic.
 */
export function explainReputation(reputation: NodeReputationProfile): ReputationExplanation {
  const { node_id, reputation_score, previous_score } = reputation;

  const contributing_factors: string[] = ['reputation_score', 'last_updated'];
  if (previous_score !== undefined) contributing_factors.push('previous_score');

  const positive_signals: string[] = [];
  if (reputation_score >= HIGH_REPUTATION_THRESHOLD) positive_signals.push('reputation_above_trust_threshold');
  if (previous_score !== undefined && reputation_score > previous_score) positive_signals.push('reputation_improved');

  const negative_signals: string[] = [];
  if (reputation_score < LOW_REPUTATION_THRESHOLD) negative_signals.push('reputation_below_trust_threshold');
  if (previous_score !== undefined && reputation_score < previous_score) negative_signals.push('reputation_declined');

  return Object.freeze({
    node_id,
    reputation_score,
    contributing_factors: Object.freeze(contributing_factors),
    positive_signals: Object.freeze(positive_signals),
    negative_signals: Object.freeze(negative_signals),
  });
}
