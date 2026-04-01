/**
 * Microstep 9L — Governance Certification Format. Certificate builder.
 */

import type {
  IRISGovernanceCertificateInput,
  IRISGovernanceCertificate,
} from '../types/certificate_types.js';
import {
  computeAuditMetadataHash,
  computeVersioningHash,
  computeCertificateHash,
} from '../hashing/certificate_hash.js';

/**
 * Build an IRIS Governance Certificate from attestation, trust index report,
 * safety proof hash, audit metadata, and versioning info.
 * Deterministic: same input → same certificate_hash.
 */
export function buildIRISGovernanceCertificate(
  input: IRISGovernanceCertificateInput
): IRISGovernanceCertificate {
  const attestation_hash = input.attestation.attestation_hash;
  const trust_index_hash = input.trust_index_report.trust_index_hash;
  const safety_proof_hash = input.safety_proof_hash;
  const audit_metadata_hash = computeAuditMetadataHash(input.audit_metadata);
  const versioning_hash = computeVersioningHash(input.versioning);

  const certificate_hash = computeCertificateHash({
    attestation_hash,
    trust_index_hash,
    safety_proof_hash,
    audit_metadata_hash,
    versioning_hash,
  });

  const cert: IRISGovernanceCertificate = Object.freeze({
    certificate_hash,
    attestation: input.attestation,
    trust_index: input.trust_index_report.trust_score,
    trust_index_hash,
    safety_proof_hash,
    audit_metadata: input.audit_metadata,
    version: input.versioning.certificate_version,
    format_version: input.versioning.format_version,
    timestamp: input.versioning.timestamp,
  });

  return cert;
}
