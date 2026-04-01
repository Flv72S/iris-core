/**
 * Step 8B — Feature gate resolver. Determines if a feature is allowed given enforcement result.
 */

import type { PolicyEnforcementResult } from '../enforcement/enforcement_engine.js';

/**
 * Resolve whether a feature is allowed.
 * - If feature is in blockedFeatures → false
 * - If feature is in allowedFeatures → true
 * - Otherwise → true (default allow)
 */
export function isFeatureAllowed(
  feature: string,
  enforcement: PolicyEnforcementResult
): boolean {
  if (enforcement.blockedFeatures.includes(feature)) return false;
  if (enforcement.allowedFeatures.includes(feature)) return true;
  return true;
}
