/**
 * Step 10B — Governance Certificate Registry. Verification delegate.
 */

import type { GovernanceCertificateRecord } from '../types/governance_registry_types.js';
import type { GovernanceVerificationResult } from '../../../governance/verification_engine/types/governance_verification_types.js';
import { runIRISCertificateVerification } from '../../../governance/verification_engine/verify/governance_verifier.js';

/**
 * Verify a stored certificate using the Phase 9 Governance Verification Engine.
 * Returns the verification result (integrity, attestation coherence, etc.).
 */
export function verifyStoredCertificate(
  record: GovernanceCertificateRecord
): GovernanceVerificationResult {
  return runIRISCertificateVerification(record.certificate);
}
