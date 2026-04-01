import assert from 'node:assert';
import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, it } from 'node:test';

import { bootstrapTrust } from '../federation/bootstrap.js';
import { InMemoryTrustDistribution } from '../federation/trust_distribution.js';
import { FederationTrustSyncEngine } from '../federation/trust_sync.js';
import type { DomainCertificate } from '../federation/domain_certificate.js';
import { buildDomainCertificatePayload } from '../federation/domain_certificate.js';
import {
  deriveNodeIdFromDer,
  tryCanonicalizePublicKey,
} from '../identity/key_canonicalization.js';
import { DEFAULT_CANONICAL_IDENTITY } from '../identity/canonical_identity.js';
import { InMemoryDomainGovernanceRegistry } from '../federation/domain_governance.js';
import { TrustPropagationEngine } from '../federation/trust_propagation.js';
import type { DomainKeyMaterial } from '../federation/trust_lifecycle.js';
import { TrustLifecycleManager } from '../federation/trust_lifecycle.js';
import { createSignedTrustLifecycleEvent } from '../federation/trust_lifecycle_events.js';
import type { TrustSnapshot } from '../federation/trust_snapshot.js';
import { verifyDomainCertificate } from '../federation/domain_certificate_verify.js';

function makeDomainKeyMaterial(): { domainId: string; keyMaterial: DomainKeyMaterial; cert: DomainCertificate } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519') as any;
  const domainPublicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  const domainPrivateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

  const canon = tryCanonicalizePublicKey(domainPublicKeyPem);
  assert.ok(canon.ok);
  const domainId = deriveNodeIdFromDer(canon.der);

  const issuedAt = Date.now();
  // Keep it comfortably valid across the entire test run.
  const expiresAt = issuedAt + 10_000_000;

  const certDraft: Omit<DomainCertificate, 'signature'> = {
    domainId,
    domainPublicKey: domainPublicKeyPem,
    canonicalIdentity: DEFAULT_CANONICAL_IDENTITY,
    algorithm: 'ed25519',
    issuedAt,
    expiresAt,
  };
  const payload = buildDomainCertificatePayload({ ...certDraft, signature: '' } as DomainCertificate);
  const signature = sign(null, Buffer.from(payload, 'utf8'), domainPrivateKeyPem).toString('base64');
  const cert: DomainCertificate = { ...certDraft, signature };
  verifyDomainCertificate(cert);

  return { domainId, keyMaterial: { domainPublicKeyPem, domainPrivateKeyPem }, cert };
}

function makeSnapshot(input: {
  version?: number;
  timestamp: number;
  domains: DomainCertificate[];
  revokedDomains?: string[];
  trustGraph: Record<string, string[]>;
}): TrustSnapshot {
  return {
    version: input.version ?? 1,
    timestamp: input.timestamp,
    domains: input.domains,
    revokedDomains: input.revokedDomains ?? [],
    trustGraph: input.trustGraph,
  };
}

function mkEng(dist: InMemoryTrustDistribution, gov: InMemoryDomainGovernanceRegistry, issuerSecretMap: Map<string, string>): TrustPropagationEngine {
  return new TrustPropagationEngine(dist, gov, (issuerNodeId) => issuerSecretMap.get(issuerNodeId));
}

describe('Trust lifecycle ecosystem (16F.X4.X5)', () => {
  it('1. Bootstrap from snapshot', async () => {
    const { domainId, cert } = makeDomainKeyMaterial();
    const snap = makeSnapshot({
      timestamp: 10,
      domains: [cert],
      revokedDomains: [],
      trustGraph: { local: [domainId] },
    });

    const dist = bootstrapTrust({ snapshot: snap });
    assert.deepStrictEqual(dist.exportTrustSnapshot().domains.map((d) => d.domainId), [domainId]);
    assert.deepStrictEqual(dist.exportTrustSnapshot().revokedDomains, []);
  });

  it('2. Invalid certificate in bootstrap → rejected', () => {
    const { domainId, cert } = makeDomainKeyMaterial();
    const badCert: DomainCertificate = { ...cert, signature: 'tampered' };
    const snap = makeSnapshot({
      timestamp: 10,
      domains: [badCert],
      revokedDomains: [],
      trustGraph: { local: [domainId] },
    });

    assert.throws(() => bootstrapTrust({ snapshot: snap }), /BOOTSTRAP_TRUST_REJECTED/);
  });

  it('3. Certificate rotation → propagated', () => {
    const issuerNodeId = 'issuer-1';
    const issuerSecret = 'issuer-secret-1';

    const gov = new InMemoryDomainGovernanceRegistry();
    const issuerSecretMap = new Map<string, string>([[issuerNodeId, issuerSecret]]);

    const base = makeDomainKeyMaterial();
    gov.register({
      domainId: base.domainId,
      canIssueCertificates: true,
      canRevokeDomains: true,
      canModifyTrustGraph: true,
    });

    const distA = new InMemoryTrustDistribution('local');
    const distB = new InMemoryTrustDistribution('local');
    distA.addTrustedDomain(base.cert, 10);
    distB.addTrustedDomain(base.cert, 10);

    const engineB = mkEng(distB, gov, issuerSecretMap);

    // Rotation key material
    const keyStore = new Map<string, DomainKeyMaterial>([[base.domainId, base.keyMaterial]]);
    const lifecycleA = new TrustLifecycleManager(distA, keyStore);

    const ev = lifecycleA.rotateDomainKey({
      domainId: base.domainId,
      issuerNodeId,
      signingSecret: issuerSecret,
      timestamp: 20,
      expiresAt: base.cert.expiresAt!,
    });

    // Receiver must accept governance for the rotated (new) domainId too.
    const newDomainId = ev.payload.rotatedToDomainId as string;
    gov.register({
      domainId: newDomainId,
      canIssueCertificates: true,
      canRevokeDomains: true,
      canModifyTrustGraph: true,
    });

    engineB.receive(ev);

    const bSnap = distB.exportTrustSnapshot();
    assert.strictEqual(bSnap.domains.length, 1);
    assert.strictEqual(bSnap.domains[0]!.domainId, newDomainId);
    assert.ok(bSnap.revokedDomains.includes(base.domainId));
  });

  it('4. Renewal → accepted', () => {
    const issuerNodeId = 'issuer-2';
    const issuerSecret = 'issuer-secret-2';

    const gov = new InMemoryDomainGovernanceRegistry();
    const issuerSecretMap = new Map<string, string>([[issuerNodeId, issuerSecret]]);

    const base = makeDomainKeyMaterial();
    gov.register({
      domainId: base.domainId,
      canIssueCertificates: true,
      canRevokeDomains: true,
      canModifyTrustGraph: true,
    });

    const distA = new InMemoryTrustDistribution('local');
    distA.addTrustedDomain(base.cert, 10);
    const engineA = mkEng(distA, gov, issuerSecretMap);

    const keyStore = new Map<string, DomainKeyMaterial>([[base.domainId, base.keyMaterial]]);
    const lifecycleA = new TrustLifecycleManager(distA, keyStore);

    const ev = lifecycleA.renewDomainCertificate({
      domainId: base.domainId,
      issuerNodeId,
      signingSecret: issuerSecret,
      timestamp: 30,
      expiresAt: base.cert.expiresAt! + 60_000,
    });

    engineA.receive(ev);
    const snap = distA.exportTrustSnapshot();
    assert.strictEqual(snap.domains.length, 1);
    assert.strictEqual(snap.domains[0]!.domainId, base.domainId);
    assert.strictEqual(snap.domains[0]!.issuedAt, 30);
  });

  it('5. Revocation propagation → global enforcement', () => {
    const issuerNodeId = 'issuer-3';
    const issuerSecret = 'issuer-secret-3';

    const gov = new InMemoryDomainGovernanceRegistry();
    const issuerSecretMap = new Map<string, string>([[issuerNodeId, issuerSecret]]);

    const base = makeDomainKeyMaterial();
    gov.register({
      domainId: base.domainId,
      canIssueCertificates: true,
      canRevokeDomains: true,
      canModifyTrustGraph: true,
    });

    const distA = new InMemoryTrustDistribution('local');
    const distB = new InMemoryTrustDistribution('local');
    distA.addTrustedDomain(base.cert, 10);
    distB.addTrustedDomain(base.cert, 10);

    const engineA = mkEng(distA, gov, issuerSecretMap);
    const engineB = mkEng(distB, gov, issuerSecretMap);

    const ev = createSignedTrustLifecycleEvent({
      type: 'DOMAIN_REVOKED',
      domainId: base.domainId,
      issuerNodeId,
      signingSecret: issuerSecret,
      timestamp: 40,
      payload: { reason: 'test' },
    });
    engineA.receive(ev);
    engineB.receive(ev);

    assert.ok(distB.isDomainRevoked(base.domainId));
    assert.deepStrictEqual(distB.exportTrustSnapshot().revokedDomains, [base.domainId]);
  });

  it('6. Unauthorized lifecycle event → rejected', () => {
    const issuerNodeId = 'issuer-4';
    const issuerSecret = 'issuer-secret-4';

    const gov = new InMemoryDomainGovernanceRegistry();
    gov.register({
      domainId: 'D',
      canIssueCertificates: false,
      canRevokeDomains: false,
      canModifyTrustGraph: false,
    });
    const issuerSecretMap = new Map<string, string>([[issuerNodeId, issuerSecret]]);

    const dist = new InMemoryTrustDistribution('local');
    const engine = mkEng(dist, gov, issuerSecretMap);

    // Missing valid signature for certificate doesn't matter; we are testing governance rejection.
    const ev = createSignedTrustLifecycleEvent({
      type: 'DOMAIN_REVOKED',
      domainId: 'D',
      issuerNodeId,
      signingSecret: issuerSecret,
      timestamp: 50,
      payload: { reason: 'unauthorized' },
    });

    assert.throws(() => engine.receive(ev), /UNAUTHORIZED_LIFECYCLE_EVENT/);
  });

  it('7. Snapshot sync mismatch → reconciled', () => {
    const domainA = makeDomainKeyMaterial();
    const domainB = makeDomainKeyMaterial();

    const dist1 = new InMemoryTrustDistribution('local');
    const dist2 = new InMemoryTrustDistribution('local');

    dist1.addTrustedDomain(domainA.cert, 10);
    dist2.addTrustedDomain(domainB.cert, 12);

    const sync1 = new FederationTrustSyncEngine(dist1);
    const sync2 = new FederationTrustSyncEngine(dist2);

    sync1.syncTrustState(dist2.exportTrustSnapshot());
    sync2.syncTrustState(dist1.exportTrustSnapshot());

    const s1 = dist1.exportTrustSnapshot();
    const s2 = dist2.exportTrustSnapshot();
    assert.strictEqual(s1.domains.length, 2);
    assert.deepStrictEqual(
      s1.domains.map((d) => d.domainId).sort(),
      s2.domains.map((d) => d.domainId).sort(),
    );
    assert.deepStrictEqual(s1.revokedDomains, s2.revokedDomains);
  });

  it('8. Multi-node convergence → consistent', () => {
    const A = makeDomainKeyMaterial();
    const B = makeDomainKeyMaterial();
    const C = makeDomainKeyMaterial();

    const dist1 = new InMemoryTrustDistribution('local');
    const dist2 = new InMemoryTrustDistribution('local');
    const dist3 = new InMemoryTrustDistribution('local');

    dist1.addTrustedDomain(A.cert, 10);
    dist2.addTrustedDomain(B.cert, 20);
    dist3.addTrustedDomain(C.cert, 30);

    const e1 = new FederationTrustSyncEngine(dist1);
    const e2 = new FederationTrustSyncEngine(dist2);
    const e3 = new FederationTrustSyncEngine(dist3);

    // Full pairwise sync to guarantee convergence in this deterministic, snapshot-based model.
    e1.syncTrustState(dist2.exportTrustSnapshot());
    e1.syncTrustState(dist3.exportTrustSnapshot());
    e2.syncTrustState(dist1.exportTrustSnapshot());
    e2.syncTrustState(dist3.exportTrustSnapshot());
    e3.syncTrustState(dist1.exportTrustSnapshot());
    e3.syncTrustState(dist2.exportTrustSnapshot());

    const s1 = dist1.exportTrustSnapshot();
    const s2 = dist2.exportTrustSnapshot();
    const s3 = dist3.exportTrustSnapshot();
    assert.deepStrictEqual(s1.domains.map((d) => d.domainId).sort(), [A.domainId, B.domainId, C.domainId].sort());
    assert.deepStrictEqual(s2.domains.map((d) => d.domainId).sort(), s1.domains.map((d) => d.domainId).sort());
    assert.deepStrictEqual(s3.domains.map((d) => d.domainId).sort(), s1.domains.map((d) => d.domainId).sort());
  });

  it('9. Replay attack on lifecycle event → rejected', () => {
    const issuerNodeId = 'issuer-5';
    const issuerSecret = 'issuer-secret-5';

    const gov = new InMemoryDomainGovernanceRegistry();
    const issuerSecretMap = new Map<string, string>([[issuerNodeId, issuerSecret]]);

    const base = makeDomainKeyMaterial();
    gov.register({
      domainId: base.domainId,
      canIssueCertificates: true,
      canRevokeDomains: true,
      canModifyTrustGraph: true,
    });

    const dist = new InMemoryTrustDistribution('local');
    dist.addTrustedDomain(base.cert, 10);
    const engine = mkEng(dist, gov, issuerSecretMap);

    const ev = createSignedTrustLifecycleEvent({
      type: 'DOMAIN_REVOKED',
      domainId: base.domainId,
      issuerNodeId,
      signingSecret: issuerSecret,
      timestamp: 60,
      payload: { reason: 'replay-test' },
    });

    engine.receive(ev);
    const snap1 = dist.exportTrustSnapshot();

    // Replay the exact same event object (same deterministic eventId).
    engine.receive(ev);
    const snap2 = dist.exportTrustSnapshot();

    assert.deepStrictEqual(snap2, snap1);
  });
});

