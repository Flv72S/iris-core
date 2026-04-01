/**
 * Phase 13H — Network Trust Observatory. Trust distribution analytics.
 */

import type { NodeReputationProfile } from '../reputation_engine/index.js';
import type { TrustDistributionReport } from './observatory_types.js';

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Analyze reputation distribution. Deterministic; distribution sorted ascending.
 */
export function analyzeTrustDistribution(
  reputations: readonly NodeReputationProfile[],
  timestamp: number
): TrustDistributionReport {
  const scores = reputations.map((r) => r.reputation_score);
  const sorted = [...scores].sort((a, b) => a - b);

  const min_reputation = sorted.length > 0 ? sorted[0]! : 0;
  const max_reputation = sorted.length > 0 ? sorted[sorted.length - 1]! : 0;
  const median_reputation = median(sorted);

  const high_trust_nodes = scores.filter((s) => s > 0.75).length;
  const low_trust_nodes = scores.filter((s) => s < 0.25).length;

  return Object.freeze({
    timestamp,
    reputation_distribution: sorted,
    min_reputation,
    max_reputation,
    median_reputation,
    high_trust_nodes,
    low_trust_nodes,
  });
}
