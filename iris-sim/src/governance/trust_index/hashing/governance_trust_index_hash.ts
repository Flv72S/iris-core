/**
 * Step 9J — Governance Trust Index Engine. Deterministic report hash.
 */

import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import type { GovernanceTrustIndexReport } from '../types/governance_trust_index_types.js';

/**
 * Compute deterministic hash of the trust index report.
 */
export function computeGovernanceTrustIndexHash(
  report: GovernanceTrustIndexReport
): string {
  return hashObjectDeterministic({
    telemetry_hash: report.telemetry_hash,
    anomaly_hash: report.anomaly_hash,
    safety_proof_hash: report.safety_proof_hash,
    trust_score: report.trust_score,
    breakdown: report.breakdown,
  });
}
