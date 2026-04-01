/**
 * Phase 11B — Governance certificate verification.
 * Verifies signature (hash integrity), temporal validity, and trust anchor.
 */

import type { GovernanceCertificate, TrustAnchor } from '../types/federated_node_registry_types.js';
import { hashRegistryPayload } from '../hashing/registry_hash.js';

/**
 * Compute expected certificate hash from content (all fields except certificate_hash).
 */
export function computeCertificateHash(cert: GovernanceCertificate): string {
  const payload = {
    certificate_id: cert.certificate_id,
    issuer: cert.issuer,
    issued_to_node: cert.issued_to_node,
    public_key: cert.public_key,
    signature: cert.signature,
    issued_at: cert.issued_at,
    expires_at: cert.expires_at,
  };
  return hashRegistryPayload(payload);
}

/**
 * Verify governance certificate:
 * - Hash integrity: certificate_hash matches computed hash
 * - Temporal validity: issued_at <= asOfTime <= expires_at
 * - Trust anchor: issuer present in trust_anchors (by trust_anchor_id or issuer match)
 */
export function verifyGovernanceCertificate(
  certificate: GovernanceCertificate,
  trustAnchors: readonly TrustAnchor[],
  asOfTime: number = Date.now()
): { valid: boolean; reason?: string } {
  const expectedHash = computeCertificateHash(certificate);
  if (expectedHash !== certificate.certificate_hash) {
    return { valid: false, reason: 'certificate_hash_mismatch' };
  }
  if (asOfTime < certificate.issued_at) {
    return { valid: false, reason: 'certificate_not_yet_valid' };
  }
  if (asOfTime > certificate.expires_at) {
    return { valid: false, reason: 'certificate_expired' };
  }
  const trusted = trustAnchors.some(
    (ta) => ta.trust_anchor_id === certificate.issuer || ta.organization === certificate.issuer
  );
  if (!trusted) {
    return { valid: false, reason: 'issuer_not_trusted' };
  }
  return { valid: true };
}
