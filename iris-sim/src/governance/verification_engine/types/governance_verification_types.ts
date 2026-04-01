/**
 * Microstep 9M — Governance Verification Engine. Types.
 */

export type VerificationStatus = 'PASS' | 'FAIL';

/** Result of verifying an IRIS Governance Certificate. Exportable and verifiable by third parties. */
export interface GovernanceVerificationResult {
  readonly certificate_id: string;
  readonly verification_status: VerificationStatus;
  readonly integrity_hash_check: boolean;
  readonly attestation_coherence_check: boolean;
  readonly safety_proof_validity: boolean;
  readonly trust_index_consistency: boolean;
  readonly telemetry_integrity_check: boolean;
  readonly verification_hash: string;
  readonly timestamp_verification: boolean;
  readonly error_message?: string;
  readonly alerts?: readonly string[];
}
