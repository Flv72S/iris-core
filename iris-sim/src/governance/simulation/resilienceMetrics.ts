/**
 * Step 7D — Resilience metrics from score and tier timelines.
 */

import type { GovernanceTier } from '../tiering/hysteresis.js';

export interface GovernanceResilienceMetrics {
  readonly maxScoreDrop: number;
  readonly recoverySteps: number | null;
  readonly tierVolatility: number;
}

const TIER_ORDER: GovernanceTier[] = [
  'TIER_0_LOCKED',
  'TIER_1_RESTRICTED',
  'TIER_2_CONTROLLED',
  'TIER_3_STABLE',
  'TIER_4_ENTERPRISE_READY',
];

function tierIndex(t: GovernanceTier): number {
  const i = TIER_ORDER.indexOf(t);
  return i >= 0 ? i : 0;
}

/**
 * Compute resilience metrics from simulation score and tier timelines.
 */
export function computeResilienceMetrics(
  scores: readonly number[],
  tiers: readonly GovernanceTier[]
): GovernanceResilienceMetrics {
  if (scores.length === 0) {
    return Object.freeze({
      maxScoreDrop: 0,
      recoverySteps: null,
      tierVolatility: 0,
    });
  }

  const initialScore = scores[0] ?? 0;
  let minScore = initialScore;
  for (let i = 0; i < scores.length; i++) {
    const s = scores[i] ?? 0;
    if (s < minScore) minScore = s;
  }
  const maxScoreDrop = Math.max(0, initialScore - minScore);

  let recoverySteps: number | null = null;
  if (minScore < initialScore) {
    for (let i = 0; i < scores.length; i++) {
      if ((scores[i] ?? 0) >= initialScore - 0.01) {
        recoverySteps = i;
        break;
      }
    }
  }

  let tierVolatility = 0;
  if (tiers.length > 1) {
    let changes = 0;
    for (let i = 1; i < tiers.length; i++) {
      if (tierIndex(tiers[i]!) !== tierIndex(tiers[i - 1]!)) changes++;
    }
    tierVolatility = changes / (tiers.length - 1);
  }

  return Object.freeze({
    maxScoreDrop,
    recoverySteps,
    tierVolatility,
  });
}
