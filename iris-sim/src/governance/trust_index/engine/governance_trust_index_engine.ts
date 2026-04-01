/**
 * Step 9J — Governance Trust Index Engine.
 */

import type {
  GovernanceTrustIndexInput,
  GovernanceTrustIndexReport,
} from '../types/governance_trust_index_types.js';
import { calculateGovernanceTrustScore } from '../scoring/governance_trust_scoring.js';
import { computeGovernanceTrustIndexHash } from '../hashing/governance_trust_index_hash.js';

/**
 * Generate trust index report: compute breakdown, aggregate trust_score, and hash.
 * Does not mutate input.
 */
export function generateGovernanceTrustIndex(
  input: GovernanceTrustIndexInput
): GovernanceTrustIndexReport {
  const breakdown = calculateGovernanceTrustScore(input);
  const trust_score =
    breakdown.telemetry_score * 0.3 +
    breakdown.anomaly_score * 0.3 +
    breakdown.safety_score * 0.4;

  const telemetry_hash = input.telemetry.telemetry_hash;
  const anomaly_hash = input.anomaly_report.anomaly_hash;
  const safety_proof_hash = input.safety_proof.proof_hash;

  const report: GovernanceTrustIndexReport = {
    telemetry_hash,
    anomaly_hash,
    safety_proof_hash,
    trust_score,
    breakdown,
    trust_index_hash: '', // set below
  };

  const trust_index_hash = computeGovernanceTrustIndexHash(report);

  return Object.freeze({
    ...report,
    trust_index_hash,
  });
}
