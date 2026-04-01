/**
 * Step 9G — Governance Telemetry Engine. Verifier.
 */

import type {
  GovernanceTelemetryInput,
  GovernanceTelemetryReport,
} from '../types/governance_telemetry_types.js';
import { generateGovernanceTelemetry } from '../engine/governance_telemetry_engine.js';

/**
 * Verify a telemetry report by re-running generation and comparing telemetry_hash and metrics.
 */
export function verifyGovernanceTelemetry(
  input: GovernanceTelemetryInput,
  report: GovernanceTelemetryReport
): boolean {
  try {
    const expected = generateGovernanceTelemetry(input);
    if (report.telemetry_hash !== expected.telemetry_hash) return false;
    if (report.source_observatory_hash !== expected.source_observatory_hash) return false;
    const m = report.metrics;
    const e = expected.metrics;
    return (
      m.total_events === e.total_events &&
      m.snapshot_events === e.snapshot_events &&
      m.diff_events === e.diff_events &&
      m.compliance_events === e.compliance_events &&
      m.incident_events === e.incident_events
    );
  } catch {
    return false;
  }
}
