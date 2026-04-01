/**
 * Step 6A — Governance signal types.
 * Passive mode: intention only, no application.
 */

export type GovernanceMode = 'NORMAL' | 'CONSERVATIVE' | 'RECOVERY' | 'FROZEN';

export interface GovernanceSignal {
  readonly budgetMultiplier: number;
  readonly commitRateMultiplier: number;
  readonly adaptationDampening: number;
  readonly mode: GovernanceMode;
  readonly confidence: number;
}

export interface GovernanceConfig {
  readonly conservativeRiskThreshold: number;
  readonly frozenRiskThreshold: number;
  readonly strongPlateauBoost: number;
  readonly weakPlateauBoost: number;
}

export const DefaultGovernanceConfig: GovernanceConfig = Object.freeze({
  conservativeRiskThreshold: 0.6,
  frozenRiskThreshold: 0.85,
  strongPlateauBoost: 1.1,
  weakPlateauBoost: 1.05,
});
