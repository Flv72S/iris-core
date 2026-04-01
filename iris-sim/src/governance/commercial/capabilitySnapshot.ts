/**
 * Step 7C — Commercial capability snapshot. Unified tier, packages, feature access.
 */

import type { CommercialModelVersion } from './commercialModel.js';
import type { GovernanceTier } from '../tiering/hysteresis.js';
import type { GovernanceTierSnapshot } from '../tiering/snapshot.js';
import type { GovernanceCertification } from '../certification/certification.js';
import type { CommercialPackage } from './packagePolicy.js';
import type { FeatureAccessDecision } from './featureGating.js';
import { evaluatePackageEligibility } from './packageEligibility.js';
import { evaluateAllFeatures } from './featureGating.js';

export interface CommercialCapabilitySnapshot {
  readonly modelVersion: CommercialModelVersion;
  readonly tier: GovernanceTier;
  readonly availablePackages: readonly CommercialPackage[];
  readonly featureAccess: readonly FeatureAccessDecision[];
  readonly evaluatedAt: number;
}

export interface CommercialSnapshotContext {
  readonly stressTestPassed?: boolean;
}

/**
 * Generate full commercial snapshot: tier, eligible packages, all feature decisions.
 */
export function generateCommercialSnapshot(
  tierSnapshot: GovernanceTierSnapshot,
  certification: GovernanceCertification | null,
  context?: CommercialSnapshotContext
): CommercialCapabilitySnapshot {
  const evaluatedAt = Date.now();
  const availablePackages = evaluatePackageEligibility(tierSnapshot);
  const featureAccess = evaluateAllFeatures(tierSnapshot, certification, context);
  return Object.freeze({
    modelVersion: '7C_v1.0',
    tier: tierSnapshot.tier,
    availablePackages,
    featureAccess,
    evaluatedAt,
  });
}
