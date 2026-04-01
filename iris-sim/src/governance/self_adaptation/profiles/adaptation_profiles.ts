/**
 * Step 8C — Deterministic tier → adaptation profile mapping.
 */

import type { AdaptationProfile } from '../types/adaptation_types.js';
import type { GovernanceTier } from '../../tiering/hysteresis.js';

const PROFILES: Record<GovernanceTier, AdaptationProfile> = {
  TIER_0_LOCKED: Object.freeze({
    autonomy: 'DISABLED',
    auditFrequencyMultiplier: 3,
    safetyConstraintLevel: 1.0,
    allowedFeatureSet: Object.freeze([]),
  }),
  TIER_1_RESTRICTED: Object.freeze({
    autonomy: 'LIMITED',
    auditFrequencyMultiplier: 2,
    safetyConstraintLevel: 0.8,
    allowedFeatureSet: Object.freeze(['basic_analysis']),
  }),
  TIER_2_CONTROLLED: Object.freeze({
    autonomy: 'SUPERVISED',
    auditFrequencyMultiplier: 1.5,
    safetyConstraintLevel: 0.6,
    allowedFeatureSet: Object.freeze(['basic_analysis', 'assisted_decision']),
  }),
  TIER_3_STABLE: Object.freeze({
    autonomy: 'SUPERVISED',
    auditFrequencyMultiplier: 1.2,
    safetyConstraintLevel: 0.4,
    allowedFeatureSet: Object.freeze([
      'basic_analysis',
      'assisted_decision',
      'advanced_analysis',
    ]),
  }),
  TIER_4_ENTERPRISE_READY: Object.freeze({
    autonomy: 'FULL',
    auditFrequencyMultiplier: 1,
    safetyConstraintLevel: 0.2,
    allowedFeatureSet: Object.freeze([
      'basic_analysis',
      'assisted_decision',
      'advanced_analysis',
      'autonomous_decision',
    ]),
  }),
};

const TIER_ALIASES: Record<string, GovernanceTier> = {
  TIER_0: 'TIER_0_LOCKED',
  TIER_1: 'TIER_1_RESTRICTED',
  TIER_2: 'TIER_2_CONTROLLED',
  TIER_3: 'TIER_3_STABLE',
  TIER_4: 'TIER_4_ENTERPRISE_READY',
  TIER_0_LOCKED: 'TIER_0_LOCKED',
  TIER_1_RESTRICTED: 'TIER_1_RESTRICTED',
  TIER_2_CONTROLLED: 'TIER_2_CONTROLLED',
  TIER_3_STABLE: 'TIER_3_STABLE',
  TIER_4_ENTERPRISE_READY: 'TIER_4_ENTERPRISE_READY',
};

export function getAdaptationProfileForTier(tier: string): AdaptationProfile {
  const t = TIER_ALIASES[tier] ?? tier;
  const profile = PROFILES[t as GovernanceTier];
  if (!profile) {
    return PROFILES.TIER_0_LOCKED;
  }
  return profile;
}
