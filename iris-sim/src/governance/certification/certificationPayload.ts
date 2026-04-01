/**
 * Step 7B — Certification payload derived from GovernanceTierSnapshot.
 */

import type { GovernanceTierSnapshot } from '../tiering/snapshot.js';
import type { GovernanceTier } from '../tiering/hysteresis.js';

export interface CertificationPayload {
  readonly modelVersion: string;
  readonly tier: GovernanceTier;
  readonly score: number;
  readonly computedAt: number;
  readonly normalizedMetrics: Record<string, number>;
}

export function snapshotToPayload(snapshot: GovernanceTierSnapshot): CertificationPayload {
  const m = snapshot.normalizedMetrics;
  return Object.freeze({
    modelVersion: snapshot.modelVersion,
    tier: snapshot.tier,
    score: snapshot.score,
    computedAt: snapshot.computedAt,
    normalizedMetrics: {
      entropyControl: m.entropyControl,
      flipStability: m.flipStability,
      invariantIntegrity: m.invariantIntegrity,
      violationPressure: m.violationPressure,
    },
  });
}
