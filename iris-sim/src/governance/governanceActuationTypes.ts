/**
 * Step 6C — Governance actuation gate types.
 * Decision layer only; no application of signal.
 */

export type GovernanceActuationReason =
  | 'NOT_STABLE'
  | 'INSUFFICIENT_STABILITY_HISTORY'
  | 'FROZEN_MODE'
  | 'APPROVED';

export interface GovernanceActuationDecision {
  readonly allowed: boolean;
  readonly reason: GovernanceActuationReason;
  readonly stabilityStreak: number;
}

export interface GovernanceActuationConfig {
  readonly requiredStableCycles: number;
}

export const DefaultGovernanceActuationConfig: GovernanceActuationConfig = Object.freeze({
  requiredStableCycles: 5,
});
