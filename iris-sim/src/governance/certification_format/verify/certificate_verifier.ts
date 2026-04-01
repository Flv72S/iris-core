/**
 * Microstep 9L — Governance Certification Format. Integrity verification.
 */

import type { IRISGovernanceCertificate } from '../types/certificate_types.js';
import {
  computeAuditMetadataHash,
  computeVersioningHash,
  computeCertificateHash,
} from '../hashing/certificate_hash.js';

/**
 * Verify certificate integrity by recomputing component hashes and certificate_hash.
 * Does not verify digital signature (that is external).
 */
export function verifyIRISGovernanceCertificate(
  certificate: IRISGovernanceCertificate
): boolean {
  try {
    const attestation_hash = certificate.attestation.attestation_hash;
    const trust_index_hash = certificate.trust_index_hash;
    const safety_proof_hash = certificate.safety_proof_hash;
    const audit_metadata_hash = computeAuditMetadataHash(certificate.audit_metadata);
    const versioning_hash = computeVersioningHash({
      certificate_version: certificate.version,
      format_version: certificate.format_version,
      timestamp: certificate.timestamp,
    });

    const expected_hash = computeCertificateHash({
      attestation_hash,
      trust_index_hash,
      safety_proof_hash,
      audit_metadata_hash,
      versioning_hash,
    });

    return certificate.certificate_hash === expected_hash;
  } catch {
    return false;
  }
}
