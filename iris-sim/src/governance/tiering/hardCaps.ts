/**
 * Step 7A — Hard caps. Absolute tier limits from invariants and stress.
 */

import type { GovernanceSignalSnapshot } from '../governanceSignalStabilityTypes.js';
import type { GovernanceTier } from './hysteresis.js';
import { tierFromScore, tierOneBelow } from './hysteresis.js';

/**
 * Extended snapshot for tiering: base snapshot + optional caps inputs.
 * Does not modify GovernanceSignalSnapshot; optional fields from stability/hardening.
 */
export interface GovernanceSnapshotForTiering extends GovernanceSignalSnapshot {
  readonly flipRate?: number;
  readonly entropyIndex?: number;
  readonly invariantViolationCount?: number;
  readonly violationFrequency?: number;
  readonly certificationInvalid?: boolean;
  readonly stressTestFailure?: boolean;
}

export interface HardCapsResult {
  readonly adjustedScore: number;
  readonly hardCapTier: GovernanceTier | null;
}

const ENTROPY_DOWNGRADE_THRESHOLD = 0.8;

export function applyHardCaps(
  score: number,
  snapshot: GovernanceSnapshotForTiering,
  hardCapsEnabled: boolean
): HardCapsResult {
  if (!hardCapsEnabled) {
    return { adjustedScore: score, hardCapTier: null };
  }

  const invCount = snapshot.invariantViolationCount ?? 0;
  const certInvalid = snapshot.certificationInvalid ?? false;
  const stressFail = snapshot.stressTestFailure ?? false;
  const entropy = snapshot.entropyIndex ?? 0;

  let hardCapTier: GovernanceTier | null = null;

  if (invCount > 0 || certInvalid) {
    hardCapTier = 'TIER_2_CONTROLLED';
  } else if (stressFail) {
    hardCapTier = 'TIER_3_STABLE';
  }

  if (entropy > ENTROPY_DOWNGRADE_THRESHOLD) {
    const scoreTier = tierFromScore(score);
    const oneBelow = tierOneBelow(scoreTier);
    if (oneBelow !== null) {
      hardCapTier = hardCapTier === null ? oneBelow : tierMin(hardCapTier, oneBelow);
    }
  }

  function tierMin(a: GovernanceTier, b: GovernanceTier): GovernanceTier {
    const order: GovernanceTier[] = ['TIER_0_LOCKED', 'TIER_1_RESTRICTED', 'TIER_2_CONTROLLED', 'TIER_3_STABLE', 'TIER_4_ENTERPRISE_READY'];
    return order.indexOf(a) <= order.indexOf(b) ? a : b;
  }

  const adjustedScore = score;

  return Object.freeze({
    adjustedScore,
    hardCapTier,
  });
}
