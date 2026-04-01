/**
 * Step 7C — Feature identifiers and requirement registry.
 */

import type { GovernanceTier } from '../tiering/hysteresis.js';

export type IrisFeatureId =
  | 'BASIC_SIGNAL_VIEW'
  | 'GOVERNANCE_DASHBOARD'
  | 'ADVANCED_AUDIT_LOGS'
  | 'STRESS_SIMULATION'
  | 'CERTIFICATION_EXPORT'
  | 'GOVERNANCE_ANALYTICS'
  | 'ENTERPRISE_POLICY_ENGINE'
  | 'AUTONOMOUS_RECOVERY'
  | 'MULTI_ENVIRONMENT_MONITORING'
  | 'EXTERNAL_AUDIT_API';

export interface FeatureRequirement {
  readonly feature: IrisFeatureId;
  readonly minimumTier: GovernanceTier;
  readonly certificationRequired: boolean;
  readonly stressSimulationRequired: boolean;
}

export const FEATURE_REQUIREMENTS: readonly FeatureRequirement[] = Object.freeze([
  Object.freeze({
    feature: 'BASIC_SIGNAL_VIEW',
    minimumTier: 'TIER_0_LOCKED',
    certificationRequired: false,
    stressSimulationRequired: false,
  }),
  Object.freeze({
    feature: 'GOVERNANCE_DASHBOARD',
    minimumTier: 'TIER_1_RESTRICTED',
    certificationRequired: false,
    stressSimulationRequired: false,
  }),
  Object.freeze({
    feature: 'ADVANCED_AUDIT_LOGS',
    minimumTier: 'TIER_2_CONTROLLED',
    certificationRequired: false,
    stressSimulationRequired: false,
  }),
  Object.freeze({
    feature: 'GOVERNANCE_ANALYTICS',
    minimumTier: 'TIER_2_CONTROLLED',
    certificationRequired: false,
    stressSimulationRequired: false,
  }),
  Object.freeze({
    feature: 'CERTIFICATION_EXPORT',
    minimumTier: 'TIER_3_STABLE',
    certificationRequired: true,
    stressSimulationRequired: false,
  }),
  Object.freeze({
    feature: 'STRESS_SIMULATION',
    minimumTier: 'TIER_3_STABLE',
    certificationRequired: true,
    stressSimulationRequired: true,
  }),
  Object.freeze({
    feature: 'ENTERPRISE_POLICY_ENGINE',
    minimumTier: 'TIER_3_STABLE',
    certificationRequired: true,
    stressSimulationRequired: false,
  }),
  Object.freeze({
    feature: 'MULTI_ENVIRONMENT_MONITORING',
    minimumTier: 'TIER_3_STABLE',
    certificationRequired: true,
    stressSimulationRequired: false,
  }),
  Object.freeze({
    feature: 'AUTONOMOUS_RECOVERY',
    minimumTier: 'TIER_4_ENTERPRISE_READY',
    certificationRequired: true,
    stressSimulationRequired: true,
  }),
  Object.freeze({
    feature: 'EXTERNAL_AUDIT_API',
    minimumTier: 'TIER_4_ENTERPRISE_READY',
    certificationRequired: true,
    stressSimulationRequired: true,
  }),
]);

const TIER_ORDER: GovernanceTier[] = [
  'TIER_0_LOCKED',
  'TIER_1_RESTRICTED',
  'TIER_2_CONTROLLED',
  'TIER_3_STABLE',
  'TIER_4_ENTERPRISE_READY',
];

export function tierOrderIndex(tier: GovernanceTier): number {
  const i = TIER_ORDER.indexOf(tier);
  return i >= 0 ? i : -1;
}

export function tierSatisfiesMinimum(current: GovernanceTier, minimum: GovernanceTier): boolean {
  return tierOrderIndex(current) >= tierOrderIndex(minimum);
}

export function getRequirement(feature: IrisFeatureId): FeatureRequirement | undefined {
  return FEATURE_REQUIREMENTS.find((r) => r.feature === feature);
}
