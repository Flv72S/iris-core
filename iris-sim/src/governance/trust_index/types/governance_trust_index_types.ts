/**
 * Step 9J — Governance Trust Index Engine. Types.
 */

import type { GovernanceTelemetryReport } from '../../telemetry/types/governance_telemetry_types.js';
import type { GovernanceAnomalyReport } from '../../anomaly_detection/types/governance_anomaly_types.js';
import type { GovernanceSafetyProof } from '../../safety_proof/types/governance_safety_proof_types.js';

export interface GovernanceTrustIndexInput {
  readonly telemetry: GovernanceTelemetryReport;
  readonly anomaly_report: GovernanceAnomalyReport;
  readonly safety_proof: GovernanceSafetyProof;
}

export interface GovernanceTrustScoreBreakdown {
  readonly telemetry_score: number;
  readonly anomaly_score: number;
  readonly safety_score: number;
}

export interface GovernanceTrustIndexReport {
  readonly telemetry_hash: string;
  readonly anomaly_hash: string;
  readonly safety_proof_hash: string;
  readonly trust_score: number;
  readonly breakdown: GovernanceTrustScoreBreakdown;
  readonly trust_index_hash: string;
}
