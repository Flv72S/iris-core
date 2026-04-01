/**
 * Step 7C — Commercial package policies. Package → minimum tier.
 */

import type { GovernanceTier } from '../tiering/hysteresis.js';

export type CommercialPackage =
  | 'COMMUNITY'
  | 'PROFESSIONAL'
  | 'ENTERPRISE'
  | 'SOVEREIGN';

export interface PackagePolicy {
  readonly package: CommercialPackage;
  readonly minimumTier: GovernanceTier;
}

export const PACKAGE_POLICIES: readonly PackagePolicy[] = Object.freeze([
  Object.freeze({ package: 'COMMUNITY', minimumTier: 'TIER_0_LOCKED' }),
  Object.freeze({ package: 'PROFESSIONAL', minimumTier: 'TIER_1_RESTRICTED' }),
  Object.freeze({ package: 'ENTERPRISE', minimumTier: 'TIER_2_CONTROLLED' }),
  Object.freeze({ package: 'SOVEREIGN', minimumTier: 'TIER_3_STABLE' }),
]);
