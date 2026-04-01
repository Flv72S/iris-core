/**
 * Step 9I — Governance Safety Proof Engine.
 */

import type {
  GovernanceSafetyProof,
  GovernanceSafetyProofInput,
} from '../types/governance_safety_proof_types.js';
import {
  checkDeterminismInvariant,
  checkTelemetryConsistencyInvariant,
  checkAnomalyTraceabilityInvariant,
  checkHashIntegrityInvariant,
} from '../invariants/governance_invariants.js';
import { computeGovernanceSafetyProofHash } from '../hashing/governance_safety_proof_hash.js';

/**
 * Generate a governance safety proof: run all invariants and build proof with deterministic hash.
 * Does not mutate input.
 */
export function generateGovernanceSafetyProof(
  input: GovernanceSafetyProofInput
): GovernanceSafetyProof {
  const invariants = [
    checkDeterminismInvariant(input.snapshot),
    checkTelemetryConsistencyInvariant(input.telemetry),
    checkAnomalyTraceabilityInvariant(input.anomaly_report),
    checkHashIntegrityInvariant(
      input.snapshot,
      input.telemetry,
      input.anomaly_report
    ),
  ];

  const snapshot_hash = input.snapshot.global_hash;
  const telemetry_hash = input.telemetry.telemetry_hash;
  const anomaly_hash = input.anomaly_report.anomaly_hash;

  const proof: GovernanceSafetyProof = {
    snapshot_hash,
    telemetry_hash,
    anomaly_hash,
    invariants: Object.freeze(invariants),
    proof_hash: '', // set below
  };

  const proof_hash = computeGovernanceSafetyProofHash(proof);

  return Object.freeze({
    ...proof,
    proof_hash,
  });
}
