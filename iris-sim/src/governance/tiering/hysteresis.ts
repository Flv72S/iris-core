/**
 * Step 7A — Tier hysteresis. Stabilizes tier transitions.
 */

export type GovernanceTier =
  | 'TIER_0_LOCKED'
  | 'TIER_1_RESTRICTED'
  | 'TIER_2_CONTROLLED'
  | 'TIER_3_STABLE'
  | 'TIER_4_ENTERPRISE_READY';

export interface TierState {
  readonly currentTier: GovernanceTier;
  readonly lastUpgradeAt: number | null;
  readonly lastDowngradeAt: number | null;
}

const TIER_ORDER: GovernanceTier[] = [
  'TIER_0_LOCKED',
  'TIER_1_RESTRICTED',
  'TIER_2_CONTROLLED',
  'TIER_3_STABLE',
  'TIER_4_ENTERPRISE_READY',
];

const THRESHOLDS: [number, GovernanceTier][] = [
  [0.9, 'TIER_4_ENTERPRISE_READY'],
  [0.75, 'TIER_3_STABLE'],
  [0.6, 'TIER_2_CONTROLLED'],
  [0.4, 'TIER_1_RESTRICTED'],
  [0, 'TIER_0_LOCKED'],
];

const UPGRADE_MARGIN = 0.03;
const DOWNGRADE_MARGIN = 0.02;
const DOWNGRADE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function tierIndex(tier: GovernanceTier): number {
  const i = TIER_ORDER.indexOf(tier);
  return i >= 0 ? i : 0;
}

export function tierFromScore(score: number): GovernanceTier {
  for (const [thr, t] of THRESHOLDS) {
    if (score >= thr) return t;
  }
  return 'TIER_0_LOCKED';
}

export function tierOneBelow(tier: GovernanceTier): GovernanceTier | null {
  const i = tierIndex(tier);
  if (i <= 0) return null;
  return TIER_ORDER[i - 1];
}

export function computeTierWithHysteresis(
  score: number,
  state: TierState,
  hardCapTier: GovernanceTier | null,
  structuralCapTier: GovernanceTier | null
): GovernanceTier {
  const now = Date.now();
  const scoreTier = tierFromScore(score);
  const scoreIdx = tierIndex(scoreTier);
  const currentIdx = tierIndex(state.currentTier);

  let candidateTier = state.currentTier;

  if (scoreIdx > currentIdx) {
    const upgradeThreshold = THRESHOLDS.find(([, t]) => t === scoreTier)?.[0] ?? 0;
    if (score >= upgradeThreshold + UPGRADE_MARGIN) {
      candidateTier = scoreTier;
    }
  } else if (scoreIdx < currentIdx) {
    const currentTierMin = THRESHOLDS.find(([, t]) => t === state.currentTier)?.[0] ?? 0;
    if (score < currentTierMin - DOWNGRADE_MARGIN) {
      const lastDown = state.lastDowngradeAt ?? 0;
      if (now - lastDown >= DOWNGRADE_COOLDOWN_MS) {
        candidateTier = scoreTier;
      }
    }
  }

  const capped = [candidateTier, hardCapTier, structuralCapTier].filter(
    (t): t is GovernanceTier => t !== null
  );
  const minIdx = Math.min(...capped.map(tierIndex));
  return TIER_ORDER[minIdx];
}
