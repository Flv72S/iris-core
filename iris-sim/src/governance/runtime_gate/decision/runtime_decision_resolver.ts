/**
 * Step 8D — Runtime decision resolver. Request + adaptation → RuntimeDecision.
 */

import type { AdaptationSnapshot } from '../../self_adaptation/types/adaptation_types.js';
import type { RuntimeActionRequest, RuntimeDecision } from '../types/runtime_types.js';
import { isFeatureExecutable } from '../guard/runtime_feature_guard.js';

/**
 * Resolve runtime decision: check requested features against adaptation profile;
 * if any not allowed → allowed=false, reason=feature_not_allowed; else allowed=true.
 */
export function resolveRuntimeDecision(
  request: RuntimeActionRequest,
  adaptation: AdaptationSnapshot
): RuntimeDecision {
  const profile = adaptation.adaptation_profile;
  const requestedFeatures = request.requestedFeatures ?? [];

  for (const feature of requestedFeatures) {
    if (!isFeatureExecutable(feature, profile)) {
      return Object.freeze({
        allowed: false,
        reason: 'feature_not_allowed',
        autonomyLevel: profile.autonomy,
        allowedFeatures: profile.allowedFeatureSet,
        auditMultiplier: profile.auditFrequencyMultiplier,
        safetyConstraintLevel: profile.safetyConstraintLevel,
      });
    }
  }

  return Object.freeze({
    allowed: true,
    autonomyLevel: profile.autonomy,
    allowedFeatures: profile.allowedFeatureSet,
    auditMultiplier: profile.auditFrequencyMultiplier,
    safetyConstraintLevel: profile.safetyConstraintLevel,
  });
}
