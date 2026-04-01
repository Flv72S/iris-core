/**
 * Step 6B — Governance signal stability monitoring types.
 * Passive analytical layer; no application of signal.
 */

import type { GovernanceMode } from './governanceTypes.js';

export interface GovernanceSignalSnapshot {
  readonly mode: GovernanceMode;
  readonly budgetMultiplier: number;
  readonly commitRateMultiplier: number;
  readonly adaptationDampening: number;
  readonly confidence: number;
}

export interface GovernanceStabilityReport {
  readonly flipCount: number;
  readonly flipRate: number;
  readonly modePersistence: number;
  readonly multiplierVolatility: number;
  readonly entropy: number;
  readonly stable: boolean;
}

export interface GovernanceStabilityThresholds {
  readonly maxFlipRate: number;
  readonly maxVolatility: number;
  readonly maxEntropy: number;
}

export const DefaultGovernanceStabilityThresholds: GovernanceStabilityThresholds = Object.freeze({
  maxFlipRate: 0.1,
  maxVolatility: 0.15,
  maxEntropy: 0.6,
});
