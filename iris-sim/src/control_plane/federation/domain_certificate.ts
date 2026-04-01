export type DomainSignatureAlgorithm = 'ed25519';

export interface DomainCertificate {
  /**
   * Domain identifier derived from domainPublicKey canonical SPKI DER:
   * SHA-256( UTF-8( DER_as_hex_lowercase ) ).
   */
  domainId: string;
  /** Ed25519 SPKI PEM */
  domainPublicKey: string;

  canonicalIdentity: 'spki_der_v1';
  algorithm: DomainSignatureAlgorithm;

  issuedAt: number;
  expiresAt?: number;

  /**
   * Base64-encoded Ed25519 signature over the canonical payload string.
   */
  signature: string;
}

export function buildDomainCertificatePayload(cert: DomainCertificate): string {
  return JSON.stringify({
    domainId: cert.domainId,
    domainPublicKey: cert.domainPublicKey,
    canonicalIdentity: cert.canonicalIdentity,
    algorithm: cert.algorithm,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt ?? null,
  });
}

