/**
 * Step 9H — Governance Anomaly Detection Engine. Deterministic report hash.
 */

import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import type { GovernanceAnomalyReport } from '../types/governance_anomaly_types.js';

/**
 * Compute deterministic hash of the anomaly report.
 */
export function computeGovernanceAnomalyHash(
  report: GovernanceAnomalyReport
): string {
  return hashObjectDeterministic({
    source_telemetry_hash: report.source_telemetry_hash,
    anomalies: report.anomalies,
    anomaly_detected: report.anomaly_detected,
  });
}
