/**
 * Phase 11E — Certificate Verifier.
 * Recomputes certificate_hash and signature; returns true if both match.
 */

import type { FederatedTrustCertificate } from '../types/trust_certificate_types.js';
import { computeCertificateHashPayload } from '../generation/trust_certificate_generator.js';
import { signTrustCertificate } from '../signing/certificate_signer.js';

/**
 * Verify trust certificate: recompute hash from payload, recompute signature, compare.
 */
export function verifyTrustCertificate(
  certificate: FederatedTrustCertificate,
  signature: string,
  signingKey: string
): boolean {
  const expectedHash = computeCertificateHashPayload({
    node_id: certificate.node_id,
    organization_id: certificate.organization_id,
    trust_index: certificate.trust_index,
    trust_level: certificate.trust_level,
    certificate_level: certificate.certificate_level,
    timestamp: certificate.certificate_timestamp,
  });
  if (expectedHash !== certificate.certificate_hash) return false;
  const expectedSignature = signTrustCertificate(certificate, signingKey);
  return expectedSignature === signature;
}
