/**
 * Step 6A — Deterministic governance signal generator.
 * Maps DynamicsReport → GovernanceSignal. O(1), no side effects, passive only.
 */

import type { DynamicsReport } from '../stability/dynamics/dynamicsTypes.js';
import type { GovernanceSignal, GovernanceMode, GovernanceConfig } from './governanceTypes.js';
import { DefaultGovernanceConfig } from './governanceTypes.js';

const BUDGET_CLAMP: [number, number] = [0.5, 1.2];
const COMMIT_CLAMP: [number, number] = [0.5, 1.2];
const DAMP_CLAMP: [number, number] = [0, 1];
const CONF_CLAMP: [number, number] = [0, 1];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class GovernanceSignalGenerator {
  private readonly _config: GovernanceConfig;

  constructor(config?: Partial<GovernanceConfig>) {
    this._config = Object.freeze({ ...DefaultGovernanceConfig, ...config });
  }

  generate(report: DynamicsReport): GovernanceSignal {
    const risk = report.residualInstabilityScore;
    const c = this._config;

    const mode: GovernanceMode =
      risk >= c.frozenRiskThreshold
        ? 'FROZEN'
        : risk >= c.conservativeRiskThreshold
          ? 'CONSERVATIVE'
          : report.convergenceStatus === 'CONVERGED'
            ? 'NORMAL'
            : 'RECOVERY';

    let budgetMultiplier: number;
    if (mode === 'FROZEN') budgetMultiplier = 0.5;
    else if (mode === 'CONSERVATIVE') budgetMultiplier = 0.75;
    else if (mode === 'RECOVERY') budgetMultiplier = 0.9;
    else {
      budgetMultiplier =
        report.plateauStrength === 'STRONG'
          ? c.strongPlateauBoost
          : report.plateauStrength === 'WEAK'
            ? c.weakPlateauBoost
            : 0.9;
    }
    budgetMultiplier = clamp(budgetMultiplier, BUDGET_CLAMP[0], BUDGET_CLAMP[1]);

    let commitRateMultiplier: number;
    if (mode === 'FROZEN') commitRateMultiplier = 0.5;
    else if (mode === 'CONSERVATIVE') commitRateMultiplier = 0.8;
    else if (mode === 'RECOVERY') commitRateMultiplier = 0.9;
    else commitRateMultiplier = 1.0;
    if (report.metaStability) commitRateMultiplier = Math.max(0.5, commitRateMultiplier - 0.1);
    commitRateMultiplier = clamp(commitRateMultiplier, COMMIT_CLAMP[0], COMMIT_CLAMP[1]);

    let adaptationDampening: number;
    if (mode === 'FROZEN') adaptationDampening = 0;
    else if (mode === 'CONSERVATIVE') adaptationDampening = 0.3;
    else if (mode === 'RECOVERY') adaptationDampening = 0.6;
    else adaptationDampening = 1;
    if (report.shockDetected) adaptationDampening *= 0.8;
    adaptationDampening = clamp(adaptationDampening, DAMP_CLAMP[0], DAMP_CLAMP[1]);

    const confidence = clamp(
      (1 - risk) * 0.5 + report.convergenceConfidence * 0.5,
      CONF_CLAMP[0],
      CONF_CLAMP[1]
    );

    return Object.freeze({
      budgetMultiplier,
      commitRateMultiplier,
      adaptationDampening,
      mode,
      confidence,
    });
  }
}
