/**
 * Step 7A — SLA commercial bridge. Tier → commercial profile (informational).
 */

import type { GovernanceTier } from './hysteresis.js';

export interface CommercialSLAProfile {
  readonly tier: GovernanceTier;
  readonly maxUptimeCommitment: number;
  readonly auditFrequencyDays: number;
  readonly certificationEligible: boolean;
  readonly stressSimulationRequired: boolean;
}

const SLA_MAP: Record<GovernanceTier, CommercialSLAProfile> = {
  TIER_0_LOCKED: Object.freeze({
    tier: 'TIER_0_LOCKED',
    maxUptimeCommitment: 95,
    auditFrequencyDays: 180,
    certificationEligible: false,
    stressSimulationRequired: false,
  }),
  TIER_1_RESTRICTED: Object.freeze({
    tier: 'TIER_1_RESTRICTED',
    maxUptimeCommitment: 97,
    auditFrequencyDays: 90,
    certificationEligible: false,
    stressSimulationRequired: false,
  }),
  TIER_2_CONTROLLED: Object.freeze({
    tier: 'TIER_2_CONTROLLED',
    maxUptimeCommitment: 98.5,
    auditFrequencyDays: 60,
    certificationEligible: false,
    stressSimulationRequired: false,
  }),
  TIER_3_STABLE: Object.freeze({
    tier: 'TIER_3_STABLE',
    maxUptimeCommitment: 99.5,
    auditFrequencyDays: 30,
    certificationEligible: true,
    stressSimulationRequired: false,
  }),
  TIER_4_ENTERPRISE_READY: Object.freeze({
    tier: 'TIER_4_ENTERPRISE_READY',
    maxUptimeCommitment: 99.9,
    auditFrequencyDays: 14,
    certificationEligible: true,
    stressSimulationRequired: true,
  }),
};

export function mapTierToSLA(tier: GovernanceTier): CommercialSLAProfile {
  return SLA_MAP[tier];
}
