/**
 * Step 9I — Governance Safety Proof Engine. Types.
 */

import type { GlobalGovernanceSnapshot } from '../../global_snapshot/types/global_snapshot_types.js';
import type { GovernanceTelemetryReport } from '../../telemetry/types/governance_telemetry_types.js';
import type { GovernanceAnomalyReport } from '../../anomaly_detection/types/governance_anomaly_types.js';

export interface GovernanceSafetyProofInput {
  readonly snapshot: GlobalGovernanceSnapshot;
  readonly telemetry: GovernanceTelemetryReport;
  readonly anomaly_report: GovernanceAnomalyReport;
}

export interface GovernanceInvariantResult {
  readonly invariant_name: string;
  readonly passed: boolean;
  readonly details?: string;
}

export interface GovernanceSafetyProof {
  readonly snapshot_hash: string;
  readonly telemetry_hash: string;
  readonly anomaly_hash: string;
  readonly invariants: readonly GovernanceInvariantResult[];
  readonly proof_hash: string;
}
