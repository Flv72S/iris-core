/**
 * Phase 11G — Certificate Integrity Verifier.
 * Read-only verification of certificate hash and classification.
 */

import type { FederatedTrustCertificate } from '../trust_certification/types/trust_certificate_types.js';
import type { AuditStatus } from './audit_types.js';

const VALID_LEVELS: readonly string[] = ['GOLD', 'SILVER', 'BRONZE'];

/** Certificate input for audit: may include optional signature for strict verification. */
export type TrustCertificateForAudit = FederatedTrustCertificate & { readonly signature?: string };

/**
 * Verify certificate integrity. Deterministic.
 * FAIL: missing or empty certificate_hash; missing signature when required (signature field present but empty).
 * WARNING: unknown certificate_level (not GOLD/SILVER/BRONZE).
 * PASS: otherwise.
 */
export function verifyCertificateIntegrity(certificate: TrustCertificateForAudit): AuditStatus {
  if (certificate.certificate_hash === undefined || certificate.certificate_hash === '') return 'FAIL';
  if ('signature' in certificate && (certificate as { signature?: string }).signature === '') return 'FAIL';
  if (!VALID_LEVELS.includes(certificate.certificate_level)) return 'WARNING';
  return 'PASS';
}
