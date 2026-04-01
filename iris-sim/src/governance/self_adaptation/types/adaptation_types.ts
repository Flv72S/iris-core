/**
 * Step 8C — Governance Self-Adaptation Engine. Types.
 */

export type AutonomyLevel =
  | 'DISABLED'
  | 'LIMITED'
  | 'SUPERVISED'
  | 'FULL';

export interface AdaptationProfile {
  readonly autonomy: AutonomyLevel;
  readonly auditFrequencyMultiplier: number;
  readonly safetyConstraintLevel: number;
  readonly allowedFeatureSet: readonly string[];
}

export interface AdaptationSnapshot {
  readonly snapshot_id: string;
  readonly tier: string;
  readonly governance_score: number;
  readonly adaptation_profile: AdaptationProfile;
  readonly timestamp: number;
}
