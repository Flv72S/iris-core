/**
 * Microstep 9M — Governance Verification Engine. Public interface.
 */

import type { IRISGovernanceCertificate } from '../../certification_format/types/certificate_types.js';
import type { GovernanceVerificationResult } from '../types/governance_verification_types.js';
import { runGovernanceVerification } from '../engine/governance_verification_engine.js';

/**
 * Verify an IRIS Governance Certificate and return a structured result.
 * Read-only, deterministic, stateless. Suitable for third-party and audit use.
 */
export function runIRISCertificateVerification(
  certificate: IRISGovernanceCertificate
): GovernanceVerificationResult {
  return runGovernanceVerification(certificate);
}

/**
 * Export verification result to JSON string for audit and external systems.
 */
export function exportVerificationResultToJSON(
  result: GovernanceVerificationResult,
  space?: number
): string {
  return JSON.stringify(result, null, space ?? 0);
}
