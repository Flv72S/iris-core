/**
 * Step 9G — Governance Telemetry Engine. Types.
 */

import type { GovernanceObservatoryReport } from '../../observatory/types/governance_observatory_types.js';

export interface GovernanceTelemetryInput {
  readonly observatory_report: GovernanceObservatoryReport;
}

export interface GovernanceTelemetryMetrics {
  readonly total_events: number;
  readonly snapshot_events: number;
  readonly diff_events: number;
  readonly compliance_events: number;
  readonly incident_events: number;
}

export interface GovernanceTelemetryReport {
  readonly source_observatory_hash: string;
  readonly metrics: GovernanceTelemetryMetrics;
  readonly telemetry_hash: string;
}
