/**
 * Step 6D — Governance activation readiness evaluator.
 * Computes readiness and intent; no application, O(1), deterministic.
 */

import type { GovernanceSignal } from '../governanceTypes.js';
import type { GovernanceStabilityReport } from '../governanceSignalStabilityTypes.js';
import type { GovernanceActuationGate } from '../governanceActuationGate.js';
import type { DynamicsReport } from '../../stability/dynamics/dynamicsTypes.js';
import type {
  GovernanceActivationReadinessReport,
  GovernanceTargetModule,
} from './activationTypes.js';

const PLATEAU_MAP: Record<string, number> = {
  STRONG: 1,
  WEAK: 0.6,
  FRAGILE: 0.2,
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function dynamicsSummaryScore(d: DynamicsReport): number {
  const D = 1 - d.residualInstabilityScore;
  const C = d.convergenceConfidence;
  const P = PLATEAU_MAP[d.plateauStrength] ?? 0.2;
  return clamp01(0.5 * D + 0.3 * C + 0.2 * P);
}

function residualRiskScore(d: DynamicsReport): number {
  const osc = 1 - d.trajectoryStabilityScore;
  const tf = Math.min(10, d.transitionFrequency);
  const inner =
    0.6 * d.residualInstabilityScore ** 2 +
    0.25 * osc ** 2 +
    0.15 * tf ** 2;
  return clamp01(1 - Math.exp(-inner));
}

function readinessConfidence(
  signal: GovernanceSignal,
  dynamicsReport: DynamicsReport,
  residualRisk: number
): number {
  return clamp01(
    0.5 * signal.confidence +
      0.3 * dynamicsReport.convergenceConfidence +
      0.2 * (1 - residualRisk)
  );
}

function recommendationText(
  intentAllowed: boolean,
  confidence: number,
  residualRisk: number,
  mode: string
): string {
  if (intentAllowed) return 'READY_FOR_ACTIVATION';
  if (mode === 'FROZEN') return 'SYSTEM_FROZEN';
  if (residualRisk > 0.35) return 'RISK_TOO_HIGH';
  if (confidence < 0.75) return 'WAIT_STABILITY_HISTORY';
  return 'WAIT_STABILITY_HISTORY';
}

export interface GovernanceActivationReadinessEvaluatorDeps {
  readonly actuationGate?: GovernanceActuationGate;
}

export class GovernanceActivationReadinessEvaluator {
  private readonly _gate: GovernanceActuationGate | undefined;

  constructor(deps?: GovernanceActivationReadinessEvaluatorDeps) {
    this._gate = deps?.actuationGate;
  }

  evaluateActivationReadiness(
    moduleName: GovernanceTargetModule,
    governanceSignal: GovernanceSignal,
    dynamicsReport: DynamicsReport,
    stabilityReport: GovernanceStabilityReport
  ): GovernanceActivationReadinessReport {
    const dynamicsSummary = dynamicsSummaryScore(dynamicsReport);
    const residualRisk = residualRiskScore(dynamicsReport);
    const confidence = readinessConfidence(governanceSignal, dynamicsReport, residualRisk);

    const gateApproved =
      this._gate != null
        ? this._gate.evaluate(governanceSignal, stabilityReport).allowed
        : false;

    const intentAllowed =
      gateApproved && confidence >= 0.75 && residualRisk <= 0.35;

    const rec = recommendationText(
      intentAllowed,
      confidence,
      residualRisk,
      governanceSignal.mode
    );

    return Object.freeze({
      moduleName,
      intentAllowed,
      dynamicsSummaryScore: dynamicsSummary,
      residualRiskScore: residualRisk,
      readinessConfidence: confidence,
      plateauState: dynamicsReport.plateauStrength,
      stabilityFlag: stabilityReport.stable,
      recommendationText: rec,
    });
  }
}
