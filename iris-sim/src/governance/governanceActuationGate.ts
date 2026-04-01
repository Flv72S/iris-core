/**
 * Step 6C — Governance actuation gate.
 * Decides if signal is applicable from stability report; no application, O(1), deterministic.
 */

import type { GovernanceSignal } from './governanceTypes.js';
import type { GovernanceStabilityReport } from './governanceSignalStabilityTypes.js';
import type {
  GovernanceActuationDecision,
  GovernanceActuationConfig,
} from './governanceActuationTypes.js';
import { DefaultGovernanceActuationConfig } from './governanceActuationTypes.js';

export class GovernanceActuationGate {
  private stableStreak: number = 0;
  private readonly _config: GovernanceActuationConfig;

  constructor(config?: Partial<GovernanceActuationConfig>) {
    this._config = Object.freeze({
      ...DefaultGovernanceActuationConfig,
      ...config,
    });
  }

  evaluate(
    signal: GovernanceSignal,
    stabilityReport: GovernanceStabilityReport
  ): GovernanceActuationDecision {
    if (signal.mode === 'FROZEN') {
      this.stableStreak = 0;
      return Object.freeze({
        allowed: false,
        reason: 'FROZEN_MODE',
        stabilityStreak: 0,
      });
    }

    if (stabilityReport.stable === false) {
      this.stableStreak = 0;
      return Object.freeze({
        allowed: false,
        reason: 'NOT_STABLE',
        stabilityStreak: 0,
      });
    }

    this.stableStreak += 1;

    if (this.stableStreak < this._config.requiredStableCycles) {
      return Object.freeze({
        allowed: false,
        reason: 'INSUFFICIENT_STABILITY_HISTORY',
        stabilityStreak: this.stableStreak,
      });
    }

    return Object.freeze({
      allowed: true,
      reason: 'APPROVED',
      stabilityStreak: this.stableStreak,
    });
  }
}
