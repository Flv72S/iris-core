import { createPublicKey, verify } from 'node:crypto';

import type { DomainCertificate } from './domain_certificate.js';
import { buildDomainCertificatePayload } from './domain_certificate.js';
import { deriveNodeIdFromDer, tryCanonicalizePublicKey } from '../identity/key_canonicalization.js';

export type DomainCertificateVerificationErrorCode =
  | 'DOMAIN_CERT_INVALID_SIGNATURE'
  | 'DOMAIN_CERT_ID_MISMATCH'
  | 'DOMAIN_CERT_EXPIRED'
  | 'DOMAIN_CERT_INVALID_KEY';

export class DomainCertificateVerificationError extends Error {
  readonly code: DomainCertificateVerificationErrorCode;
  constructor(message: string, code: DomainCertificateVerificationErrorCode) {
    super(message);
    this.name = 'DomainCertificateVerificationError';
    this.code = code;
    Object.setPrototypeOf(this, DomainCertificateVerificationError.prototype);
  }
}

function recomputeDomainIdFromDomainPublicKey(domainPublicKey: string): string {
  const canon = tryCanonicalizePublicKey(domainPublicKey);
  if (!canon.ok) throw new DomainCertificateVerificationError('Invalid domain public key', 'DOMAIN_CERT_INVALID_KEY');
  return deriveNodeIdFromDer(canon.der);
}

function verifySignature(domainPublicKey: string, payload: string, signatureBase64: string): boolean {
  try {
    const k = createPublicKey(domainPublicKey);
    // Ed25519 signature, base64.
    return verify(null, Buffer.from(payload, 'utf8'), k, Buffer.from(signatureBase64, 'base64'));
  } catch {
    return false;
  }
}

export function verifyDomainCertificate(cert: DomainCertificate): void {
  if (cert.canonicalIdentity !== 'spki_der_v1' || cert.algorithm !== 'ed25519') {
    throw new DomainCertificateVerificationError('Unsupported domain certificate parameters', 'DOMAIN_CERT_INVALID_KEY');
  }

  const now = Date.now();
  if (typeof cert.expiresAt === 'number' && Number.isFinite(cert.expiresAt)) {
    if (now > cert.expiresAt) {
      throw new DomainCertificateVerificationError('Domain certificate expired', 'DOMAIN_CERT_EXPIRED');
    }
  }

  // 1. canonicalize key + recompute domainId (deterministic)
  const recomputed = (() => {
    try {
      return recomputeDomainIdFromDomainPublicKey(cert.domainPublicKey);
    } catch (e) {
      if (e instanceof DomainCertificateVerificationError) throw e;
      throw new DomainCertificateVerificationError('Domain public key canonicalization failed', 'DOMAIN_CERT_INVALID_KEY');
    }
  })();
  if (recomputed !== cert.domainId) {
    throw new DomainCertificateVerificationError('DomainId mismatch for certificate public key', 'DOMAIN_CERT_ID_MISMATCH');
  }

  // 2. verify signature over canonical payload
  const payload = buildDomainCertificatePayload(cert);
  const ok = verifySignature(cert.domainPublicKey, payload, cert.signature);
  if (!ok) {
    throw new DomainCertificateVerificationError('Invalid domain certificate signature', 'DOMAIN_CERT_INVALID_SIGNATURE');
  }
}

