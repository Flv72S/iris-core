/**
 * Step 7C — Package eligibility. Which packages the current tier can obtain.
 */

import type { GovernanceTierSnapshot } from '../tiering/snapshot.js';
import type { CommercialPackage } from './packagePolicy.js';
import { PACKAGE_POLICIES } from './packagePolicy.js';
import { tierSatisfiesMinimum } from './featureRegistry.js';

/**
 * Return all commercial packages obtainable with the current tier.
 */
export function evaluatePackageEligibility(
  tierSnapshot: GovernanceTierSnapshot
): readonly CommercialPackage[] {
  const tier = tierSnapshot.tier;
  return PACKAGE_POLICIES.filter((p) => tierSatisfiesMinimum(tier, p.minimumTier)).map(
    (p) => p.package
  );
}
