/**
 * Step 7C — Feature gating engine. Deterministic capability evaluation.
 */

import type { GovernanceTierSnapshot } from '../tiering/snapshot.js';
import type { GovernanceCertification } from '../certification/certification.js';
import type { IrisFeatureId } from './featureRegistry.js';
import {
  FEATURE_REQUIREMENTS,
  getRequirement,
  tierSatisfiesMinimum,
} from './featureRegistry.js';

export interface FeatureAccessDecision {
  readonly feature: IrisFeatureId;
  readonly allowed: boolean;
  readonly reason?: string;
}

export interface FeatureEvaluationContext {
  readonly stressTestPassed?: boolean;
}

/**
 * Evaluate access for a single feature. If a condition is not met → allowed = false.
 */
export function evaluateFeatureAccess(
  feature: IrisFeatureId,
  tierSnapshot: GovernanceTierSnapshot,
  certification: GovernanceCertification | null,
  context?: FeatureEvaluationContext
): FeatureAccessDecision {
  const req = getRequirement(feature);
  if (!req) {
    return Object.freeze({
      feature,
      allowed: false,
      reason: 'UNKNOWN_FEATURE',
    });
  }

  if (!tierSatisfiesMinimum(tierSnapshot.tier, req.minimumTier)) {
    return Object.freeze({
      feature,
      allowed: false,
      reason: 'TIER_BELOW_MINIMUM',
    });
  }

  if (req.certificationRequired) {
    if (!certification) {
      return Object.freeze({
        feature,
        allowed: false,
        reason: 'CERTIFICATION_REQUIRED',
      });
    }
  }

  if (req.stressSimulationRequired) {
    if (context?.stressTestPassed !== true) {
      return Object.freeze({
        feature,
        allowed: false,
        reason: 'STRESS_SIMULATION_REQUIRED',
      });
    }
  }

  return Object.freeze({
    feature,
    allowed: true,
  });
}

/**
 * Evaluate access for all registered features.
 */
export function evaluateAllFeatures(
  tierSnapshot: GovernanceTierSnapshot,
  certification: GovernanceCertification | null,
  context?: FeatureEvaluationContext
): readonly FeatureAccessDecision[] {
  return FEATURE_REQUIREMENTS.map((r) =>
    evaluateFeatureAccess(r.feature, tierSnapshot, certification, context)
  );
}
