/**
 * Step 8K — Governance External Verifier. Types for independent verification.
 */

export interface VerificationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

export interface GovernanceVerificationReport {
  readonly certificateValid: boolean;
  readonly proofValid: boolean;
  readonly ledgerValid: boolean;
  readonly snapshotValid: boolean;
  readonly overallValid: boolean;
}
