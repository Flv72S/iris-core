/**
 * Step 8D — Feature guard. Feature is executable only if in adaptation profile allowed set.
 */

import type { AdaptationProfile } from '../../self_adaptation/types/adaptation_types.js';

/**
 * Feature is executable iff it is in adaptationProfile.allowedFeatureSet.
 */
export function isFeatureExecutable(
  feature: string,
  adaptationProfile: AdaptationProfile
): boolean {
  return adaptationProfile.allowedFeatureSet.includes(feature);
}
