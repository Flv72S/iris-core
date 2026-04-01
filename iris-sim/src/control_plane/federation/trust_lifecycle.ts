import { generateKeyPairSync, sign } from 'node:crypto';

import { deriveNodeIdFromDer, tryCanonicalizePublicKey } from '../identity/key_canonicalization.js';
import { DEFAULT_CANONICAL_IDENTITY } from '../identity/canonical_identity.js';
import type { DomainCertificate } from './domain_certificate.js';
import { buildDomainCertificatePayload } from './domain_certificate.js';
import type { TrustLifecycleEvent } from './trust_lifecycle_events.js';
import { createSignedTrustLifecycleEvent } from './trust_lifecycle_events.js';
import type { InMemoryTrustDistribution } from './trust_distribution.js';

export type DomainKeyMaterial = {
  domainPublicKeyPem: string;
  domainPrivateKeyPem: string;
};

function issueCertificateFromKeyMaterial(
  keyMaterial: DomainKeyMaterial,
  params: { issuedAt?: number; expiresAt?: number } = {},
): DomainCertificate {
  const canon = tryCanonicalizePublicKey(keyMaterial.domainPublicKeyPem);
  if (!canon.ok) {
    throw new Error(`DOMAIN_CERT_INVALID_KEY: cannot canonicalize public key (${canon.code})`);
  }
  const domainId = deriveNodeIdFromDer(canon.der);
  const issuedAt = params.issuedAt ?? Date.now();
  const certDraft: Omit<DomainCertificate, 'signature'> = {
    domainId,
    domainPublicKey: keyMaterial.domainPublicKeyPem,
    canonicalIdentity: DEFAULT_CANONICAL_IDENTITY,
    algorithm: 'ed25519',
    issuedAt,
    ...(params.expiresAt !== undefined ? { expiresAt: params.expiresAt } : {}),
  };
  const payload = buildDomainCertificatePayload({ ...certDraft, signature: '' } as DomainCertificate);
  const signature = sign(null, Buffer.from(payload, 'utf8'), keyMaterial.domainPrivateKeyPem).toString('base64');
  return { ...certDraft, signature };
}

export class TrustLifecycleManager {
  constructor(
    private readonly distribution: InMemoryTrustDistribution,
    private readonly keyStore: Map<string, DomainKeyMaterial>,
  ) {}

  renewDomainCertificate(input: {
    domainId: string;
    issuerNodeId: string;
    signingSecret: string;
    expiresAt?: number;
    timestamp?: number;
  }): TrustLifecycleEvent {
    const km = this.keyStore.get(input.domainId);
    if (!km) throw new Error('MISSING_DOMAIN_KEY_MATERIAL');
    const issuedAt = input.timestamp ?? Date.now();
    const newCert = issueCertificateFromKeyMaterial(km, {
      issuedAt,
      ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
    });

    // Enforce that renewal preserves domainId (derived from same public key).
    if (newCert.domainId !== input.domainId) throw new Error('DOMAIN_ID_PRESERVATION_FAILED');

    const event = createSignedTrustLifecycleEvent({
      type: 'DOMAIN_RENEWED',
      domainId: input.domainId,
      issuerNodeId: input.issuerNodeId,
      signingSecret: input.signingSecret,
      timestamp: issuedAt,
      payload: { domainCertificate: newCert },
    });

    // Apply locally first for immediate effect.
    this.distribution.addTrustedDomain(newCert, issuedAt);
    return event;
  }

  rotateDomainKey(input: {
    domainId: string;
    issuerNodeId: string;
    signingSecret: string;
    expiresAt?: number;
    timestamp?: number;
  }): TrustLifecycleEvent {
    const existing = this.keyStore.get(input.domainId);
    if (!existing) throw new Error('MISSING_DOMAIN_KEY_MATERIAL');

    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const domainPublicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    const domainPrivateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

    const rotatedCert = issueCertificateFromKeyMaterial(
      { domainPublicKeyPem, domainPrivateKeyPem },
      {
        issuedAt: input.timestamp ?? Date.now(),
        ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
      },
    );

    // Rotation invalidates the old certificate: mark old as revoked/obsolete.
    this.distribution.revokeDomain(input.domainId, input.timestamp ?? Date.now());
    this.keyStore.delete(input.domainId);
    this.keyStore.set(rotatedCert.domainId, { domainPublicKeyPem, domainPrivateKeyPem });
    this.distribution.addTrustedDomain(rotatedCert, input.timestamp ?? Date.now());

    // Emit event about the *old* domainId (what was rotated).
    return createSignedTrustLifecycleEvent({
      type: 'DOMAIN_ROTATED',
      domainId: input.domainId,
      issuerNodeId: input.issuerNodeId,
      signingSecret: input.signingSecret,
      timestamp: input.timestamp ?? Date.now(),
      payload: { domainCertificate: rotatedCert, rotatedToDomainId: rotatedCert.domainId },
    });
  }

  checkExpiredCertificates(input: { issuerNodeId: string; signingSecret: string; now?: number }): TrustLifecycleEvent[] {
    const now = input.now ?? Date.now();
    const events: TrustLifecycleEvent[] = [];
    for (const cert of this.distribution.getTrustedDomains()) {
      if (typeof cert.expiresAt === 'number' && now > cert.expiresAt) {
        // Local hard deny.
        this.distribution.revokeDomain(cert.domainId, now);
        events.push(
          createSignedTrustLifecycleEvent({
            type: 'DOMAIN_REVOKED',
            domainId: cert.domainId,
            issuerNodeId: input.issuerNodeId,
            signingSecret: input.signingSecret,
            timestamp: now,
            payload: { reason: 'DOMAIN_CERT_EXPIRED' },
          }),
        );
      }
    }
    return events;
  }
}

