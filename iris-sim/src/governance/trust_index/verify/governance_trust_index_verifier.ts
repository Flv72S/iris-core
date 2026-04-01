/**
 * Step 9J — Governance Trust Index Engine. Verifier.
 */

import type {
  GovernanceTrustIndexInput,
  GovernanceTrustIndexReport,
} from '../types/governance_trust_index_types.js';
import { generateGovernanceTrustIndex } from '../engine/governance_trust_index_engine.js';

/**
 * Verify a trust index report by re-running generation and comparing trust_index_hash and fields.
 */
export function verifyGovernanceTrustIndex(
  input: GovernanceTrustIndexInput,
  report: GovernanceTrustIndexReport
): boolean {
  try {
    const expected = generateGovernanceTrustIndex(input);
    if (report.trust_index_hash !== expected.trust_index_hash) return false;
    if (report.telemetry_hash !== expected.telemetry_hash) return false;
    if (report.anomaly_hash !== expected.anomaly_hash) return false;
    if (report.safety_proof_hash !== expected.safety_proof_hash) return false;
    if (report.trust_score !== expected.trust_score) return false;
    if (
      report.breakdown.telemetry_score !== expected.breakdown.telemetry_score ||
      report.breakdown.anomaly_score !== expected.breakdown.anomaly_score ||
      report.breakdown.safety_score !== expected.breakdown.safety_score
    )
      return false;
    return true;
  } catch {
    return false;
  }
}
