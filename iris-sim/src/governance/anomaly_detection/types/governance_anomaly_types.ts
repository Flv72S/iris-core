/**
 * Step 9H — Governance Anomaly Detection Engine. Types.
 */

import type { GovernanceTelemetryReport } from '../../telemetry/types/governance_telemetry_types.js';

export interface GovernanceAnomalyInput {
  readonly telemetry_report: GovernanceTelemetryReport;
}

export interface GovernanceAnomaly {
  readonly anomaly_id: string;
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high';
}

export interface GovernanceAnomalyReport {
  readonly source_telemetry_hash: string;
  readonly anomalies: readonly GovernanceAnomaly[];
  readonly anomaly_detected: boolean;
  readonly anomaly_hash: string;
}
