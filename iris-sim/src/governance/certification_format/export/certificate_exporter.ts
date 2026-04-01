/**
 * Microstep 9L — Governance Certification Format. Export and signature payload.
 */

import type { IRISGovernanceCertificate } from '../types/certificate_types.js';

/**
 * Payload for digital signature: certificate content without signature field.
 * Deterministic JSON serialization for signing.
 */
export function getCertificateSignaturePayload(
  certificate: IRISGovernanceCertificate
): string {
  const payload: Omit<IRISGovernanceCertificate, 'signature'> & {
    signature?: undefined;
  } = {
    certificate_hash: certificate.certificate_hash,
    attestation: certificate.attestation,
    trust_index: certificate.trust_index,
    trust_index_hash: certificate.trust_index_hash,
    safety_proof_hash: certificate.safety_proof_hash,
    audit_metadata: certificate.audit_metadata,
    version: certificate.version,
    format_version: certificate.format_version,
    timestamp: certificate.timestamp,
  };
  return JSON.stringify(payload);
}

/**
 * Attach an optional digital signature to a certificate (returns new frozen object).
 */
export function attachCertificateSignature(
  certificate: IRISGovernanceCertificate,
  signature: string
): IRISGovernanceCertificate {
  return Object.freeze({
    ...certificate,
    signature,
  });
}

/**
 * Export certificate to JSON string (deterministic, compact for audit).
 */
export function exportCertificateToJSON(
  certificate: IRISGovernanceCertificate,
  space?: number
): string {
  return JSON.stringify(certificate, null, space ?? 0);
}
