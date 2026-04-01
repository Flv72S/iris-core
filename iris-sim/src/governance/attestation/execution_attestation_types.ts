/**
 * Phase 12E — Execution Result Attestation. Types.
 * Immutable, deterministic; hash corresponds to execution result content.
 */

/** Cryptographic proof of execution. */
export interface ExecutionProof {
  readonly action_id: string;
  readonly executor_id: string;
  readonly execution_timestamp: number;
  readonly execution_status: string;
  readonly result_hash: string;
}

/** Full attestation structure (proof + signature). */
export interface ExecutionAttestation {
  readonly proof: ExecutionProof;
  readonly signature: string;
  readonly signer_id: string;
}
