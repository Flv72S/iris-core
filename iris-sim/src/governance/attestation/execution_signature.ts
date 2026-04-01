/**
 * Phase 12E — Execution Result Attestation. Signature engine.
 * Deterministic signing: signature = sha256Hex(proof.result_hash + signing_key).
 */

import { createHash } from 'node:crypto';
import type { GovernanceActionRecord } from '../registry/index.js';
import type { ExecutionAttestation, ExecutionProof } from './execution_attestation_types.js';
import { generateExecutionProof } from './execution_attestation_engine.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Sign execution proof; returns full attestation.
 */
export function signExecutionProof(
  proof: ExecutionProof,
  signing_key: string,
  signer_id: string
): ExecutionAttestation {
  const signature = sha256Hex(proof.result_hash + signing_key);
  return Object.freeze({
    proof,
    signature,
    signer_id,
  });
}

/**
 * Verify attestation by recomputing signature and comparing.
 */
export function verifyExecutionAttestation(
  attestation: ExecutionAttestation,
  signing_key: string
): boolean {
  const expected = sha256Hex(attestation.proof.result_hash + signing_key);
  return expected === attestation.signature;
}

/**
 * Create attestation from registry record. Record must have execution_result.
 */
export function createAttestationFromRecord(
  record: GovernanceActionRecord,
  signing_key: string,
  signer_id: string
): ExecutionAttestation {
  const result = record.execution_result;
  if (result === undefined) {
    throw new Error('GovernanceActionRecord must contain execution_result');
  }
  const proof = generateExecutionProof(result);
  return signExecutionProof(proof, signing_key, signer_id);
}
