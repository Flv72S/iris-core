/**
 * Step 9I — Governance Safety Proof Engine. Verifier.
 */

import type {
  GovernanceSafetyProof,
  GovernanceSafetyProofInput,
} from '../types/governance_safety_proof_types.js';
import { generateGovernanceSafetyProof } from '../engine/governance_safety_proof_engine.js';

/**
 * Verify a safety proof by re-running generation and comparing proof_hash and fields.
 */
export function verifyGovernanceSafetyProof(
  input: GovernanceSafetyProofInput,
  proof: GovernanceSafetyProof
): boolean {
  try {
    const expected = generateGovernanceSafetyProof(input);
    if (proof.proof_hash !== expected.proof_hash) return false;
    if (proof.snapshot_hash !== expected.snapshot_hash) return false;
    if (proof.telemetry_hash !== expected.telemetry_hash) return false;
    if (proof.anomaly_hash !== expected.anomaly_hash) return false;
    if (proof.invariants.length !== expected.invariants.length) return false;
    for (let i = 0; i < proof.invariants.length; i++) {
      const a = proof.invariants[i]!;
      const b = expected.invariants[i]!;
      if (
        a.invariant_name !== b.invariant_name ||
        a.passed !== b.passed ||
        (a.details ?? '') !== (b.details ?? '')
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}
