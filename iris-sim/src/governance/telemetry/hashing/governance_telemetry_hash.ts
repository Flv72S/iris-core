/**
 * Step 9G — Governance Telemetry Engine. Deterministic report hash.
 */

import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import type { GovernanceTelemetryReport } from '../types/governance_telemetry_types.js';

/**
 * Compute deterministic hash of the telemetry report.
 */
export function computeGovernanceTelemetryHash(
  report: GovernanceTelemetryReport
): string {
  return hashObjectDeterministic({
    source_observatory_hash: report.source_observatory_hash,
    metrics: report.metrics,
  });
}
