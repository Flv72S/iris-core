/**
 * Step 9I — Governance Safety Proof Engine. Deterministic proof hash.
 */

import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import type { GovernanceSafetyProof } from '../types/governance_safety_proof_types.js';

/**
 * Compute deterministic hash of the safety proof.
 */
export function computeGovernanceSafetyProofHash(
  proof: GovernanceSafetyProof
): string {
  return hashObjectDeterministic({
    snapshot_hash: proof.snapshot_hash,
    telemetry_hash: proof.telemetry_hash,
    anomaly_hash: proof.anomaly_hash,
    invariants: proof.invariants,
  });
}
