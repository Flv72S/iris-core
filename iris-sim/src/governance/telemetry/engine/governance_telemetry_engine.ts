/**
 * Step 9G — Governance Telemetry Engine.
 */

import type {
  GovernanceTelemetryInput,
  GovernanceTelemetryReport,
} from '../types/governance_telemetry_types.js';
import { calculateGovernanceMetrics } from '../metrics/governance_metrics_calculator.js';
import { computeGovernanceTelemetryHash } from '../hashing/governance_telemetry_hash.js';

/**
 * Generate telemetry report from an observatory report: compute metrics and deterministic hash.
 * Does not mutate input.
 */
export function generateGovernanceTelemetry(
  input: GovernanceTelemetryInput
): GovernanceTelemetryReport {
  const observatory = input.observatory_report;
  const metrics = calculateGovernanceMetrics(observatory);
  const source_observatory_hash = observatory.observatory_hash;

  const report: GovernanceTelemetryReport = {
    source_observatory_hash,
    metrics,
    telemetry_hash: '', // set below
  };

  const telemetry_hash = computeGovernanceTelemetryHash(report);

  return Object.freeze({
    ...report,
    telemetry_hash,
  });
}
