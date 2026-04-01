/**
 * Phase 13M.1 — Scalable Trust Graph Hardening. Pluggable trust weight computation.
 */

import type { NodeReputationProfile } from '../reputation_engine/index.js';

export interface TrustWeightCalculator {
  computeTrustWeight(
    source: NodeReputationProfile,
    target: NodeReputationProfile
  ): number;
}

/**
 * Default implementation: average of source and target reputation scores, clamped to [0, 1].
 */
export class DefaultTrustWeightCalculator implements TrustWeightCalculator {
  computeTrustWeight(
    source: NodeReputationProfile,
    target: NodeReputationProfile
  ): number {
    const weight = (source.reputation_score + target.reputation_score) / 2;
    return Math.max(0, Math.min(1, weight));
  }
}
