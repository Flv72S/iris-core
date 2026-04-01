/**
 * Phase 11E — Certificate Signer.
 * Deterministic signature: sha256Hex(certificate_hash + signingKey).
 */

import { createHash } from 'node:crypto';
import type { FederatedTrustCertificate } from '../types/trust_certificate_types.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Produce deterministic signature for a certificate. Signature is returned separately, not embedded.
 */
export function signTrustCertificate(certificate: FederatedTrustCertificate, signingKey: string): string {
  return sha256Hex(certificate.certificate_hash + signingKey);
}
