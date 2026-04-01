/**
 * Step 6F — Governance stress simulation & certification types.
 * Pure testing/certification; no runtime mutation.
 */

import type { GovernanceSignal } from '../governanceTypes.js';
import type { GovernanceStabilityReport } from '../governanceSignalStabilityTypes.js';
import type { DynamicsSnapshot, HardeningAuditReport } from '../hardening/invariantTypes.js';

export type StressScenarioType =
  | 'REGIME_DRIFT'
  | 'MODE_OSCILLATION'
  | 'RECOVERY_ACCELERATION'
  | 'PLATEAU_COLLAPSE'
  | 'ENTROPY_ESCALATION'
  | 'STABLE_BASELINE';

export interface StressSimulationConfig {
  readonly scenario: StressScenarioType;
  readonly steps?: number;
  readonly seed?: number;
}

export interface StressSimulationResult {
  readonly scenario: StressScenarioType;
  readonly steps: number;
  readonly hardeningReport: HardeningAuditReport;
  readonly stabilityReport: GovernanceStabilityReport;
  readonly certificationPassed: boolean;
  readonly certificationScore: number;
  readonly deterministicHash: string;
}

export interface StressScenarioOutput {
  readonly dynamicsHistory: readonly DynamicsSnapshot[];
  readonly governanceSignalHistory: readonly GovernanceSignal[];
}
