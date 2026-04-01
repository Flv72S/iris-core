/**
 * Step 9H — Governance Anomaly Detection Engine. Verifier.
 */

import type {
  GovernanceAnomalyInput,
  GovernanceAnomalyReport,
} from '../types/governance_anomaly_types.js';
import { detectGovernanceAnomalies } from '../engine/governance_anomaly_engine.js';

/**
 * Verify an anomaly report by re-running detection and comparing anomaly_hash and fields.
 */
export function verifyGovernanceAnomalyReport(
  input: GovernanceAnomalyInput,
  report: GovernanceAnomalyReport
): boolean {
  try {
    const expected = detectGovernanceAnomalies(input);
    if (report.anomaly_hash !== expected.anomaly_hash) return false;
    if (report.source_telemetry_hash !== expected.source_telemetry_hash) return false;
    if (report.anomaly_detected !== expected.anomaly_detected) return false;
    if (report.anomalies.length !== expected.anomalies.length) return false;
    for (let i = 0; i < report.anomalies.length; i++) {
      const a = report.anomalies[i]!;
      const b = expected.anomalies[i]!;
      if (
        a.anomaly_id !== b.anomaly_id ||
        a.description !== b.description ||
        a.severity !== b.severity
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}
