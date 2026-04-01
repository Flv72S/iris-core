import assert from 'node:assert';
import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, it } from 'node:test';

import { ControlPlaneRegistry } from '../control_plane_registry.js';
import { DistributedSyncManager } from '../distributed_sync.js';
import { InMemoryDomainRegistry } from '../domain_registry_memory.js';
import type { TrustDomain } from '../trust_domain.js';
import { InMemoryPeerRegistry } from '../peer_registry_memory.js';
import { InMemoryEd25519KeyProvider } from '../keys/in_memory_key_provider.js';
import { TrustSyncEngine } from '../trust_sync_engine.js';
import { deriveNodeId } from '../identity/node_identity.js';
import {
  deriveNodeIdFromDer,
  tryCanonicalizePublicKey,
} from '../identity/key_canonicalization.js';
import { DEFAULT_CANONICAL_IDENTITY } from '../identity/canonical_identity.js';
import type { DomainCertificate } from '../federation/domain_certificate.js';
import { buildDomainCertificatePayload } from '../federation/domain_certificate.js';

function mkEngine(localNodeId: string, localSecret: string): TrustSyncEngine {
  return new TrustSyncEngine({
    localNodeId,
    localSecret,
    registry: new ControlPlaneRegistry(),
    resolveIssuerSecret: () => undefined,
    send: () => {},
    now: () => 10_000,
  });
}

function appendAudit(engine: TrustSyncEngine, eventId: string, ts: number): void {
  engine.getAuditLog().append({
    recordId: '',
    eventId,
    nodeId: 'N',
    timestamp: ts,
    eventType: 'NODE_ACTIVATED',
    payloadHash: 'ph',
    issuer: 'I',
    verified: true,
    signerNodeId: 'AUDITOR',
    recordHash: '',
  });
}

function mkDomain(
  domainId: string,
  certificate: DomainCertificate,
  trustedDomains: string[] = [],
  trustLevel: TrustDomain['trustLevel'] = 'FULL',
): TrustDomain {
  return {
    domainId,
    name: domainId,
    acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
    supportedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
    trustedPeers: [],
    trustedDomains,
    allowCrossDomainSync: true,
    trustLevel,
    revokedDomains: [],
    domainCertificate: certificate,
  };
}

function generateDomainCertificate(expiresAt?: number): { cert: DomainCertificate } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const domainPublicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

  const canon = tryCanonicalizePublicKey(domainPublicKeyPem);
  if (!canon.ok) throw new Error('Domain public key must be canonical Ed25519/SPKI PEM');
  const domainId = deriveNodeIdFromDer(canon.der);

  const issuedAt = Date.now();
  const exp = typeof expiresAt === 'number' ? expiresAt : issuedAt + 60_000;

  const certDraft: DomainCertificate = {
    domainId,
    domainPublicKey: domainPublicKeyPem,
    canonicalIdentity: DEFAULT_CANONICAL_IDENTITY,
    algorithm: 'ed25519',
    issuedAt,
    expiresAt: exp,
    signature: '',
  };

  const payload = buildDomainCertificatePayload(certDraft);
  const sigBuf = sign(null, Buffer.from(payload, 'utf8'), privateKey);
  const signature = sigBuf.toString('base64');

  return { cert: { ...certDraft, signature } };
}

async function nodeKeyMaterial(kp: InMemoryEd25519KeyProvider): Promise<{ pubPem: string; nodeId: string }> {
  const pubPem = (await kp.getKey('protocol_signing'))!.publicKey;
  const nodeId = deriveNodeId(pubPem);
  return { pubPem, nodeId };
}

function registerPeer(reg: InMemoryPeerRegistry, peerNodeId: string, peerProtocolPubPem: string, domainId: string): void {
  reg.register({ nodeId: peerNodeId, publicKey: peerProtocolPubPem, trusted: true, domainId });
}

describe('Federation security hardening (16F.X4.HARDENING)', () => {
  it('1. valid domain certificate: accepted', async () => {
    const kpA = new InMemoryEd25519KeyProvider();
    const kpB = new InMemoryEd25519KeyProvider();
    const { pubPem: pubA, nodeId: nodeIdA } = await nodeKeyMaterial(kpA);
    const { pubPem: pubB, nodeId: nodeIdB } = await nodeKeyMaterial(kpB);

    const dcA = generateDomainCertificate();
    const dcB = generateDomainCertificate();
    const domainIdA = dcA.cert.domainId;
    const domainIdB = dcB.cert.domainId;

    const domains = new InMemoryDomainRegistry();
    domains.register(mkDomain(domainIdA, dcA.cert, [domainIdB], 'FULL'));
    domains.register(mkDomain(domainIdB, dcB.cert, [domainIdA], 'FULL'));

    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerPeer(peersA, nodeIdB, pubB, domainIdB);
    registerPeer(peersB, nodeIdA, pubA, domainIdA);

    const a = mkEngine(nodeIdA, 'a-secret');
    const b = mkEngine(nodeIdB, 'b-secret');
    appendAudit(a, 'e1', 1);

    const ma = new DistributedSyncManager(kpA, a, peersA, domains, domainIdA, {});
    const mb = new DistributedSyncManager(kpB, b, peersB, domains, domainIdB, {});

    await mb.receiveRoot(await ma.announceRoot());
    assert.strictEqual(mb.getSyncState(nodeIdA).lastKnownRoot, a.getAuditSnapshot().merkleRoot);

    const req = await mb.requestProof(nodeIdA, 0);
    const resp = await ma.createProofResponse(req);
    assert.ok(resp);
    await mb.receiveProofResponse(resp);
    assert.strictEqual(b.getAuditSnapshot().merkleRoot, a.getAuditSnapshot().merkleRoot);
  });

  it('2. invalid signature: rejected', async () => {
    const kpA = new InMemoryEd25519KeyProvider();
    const kpB = new InMemoryEd25519KeyProvider();
    const { pubPem: pubA, nodeId: nodeIdA } = await nodeKeyMaterial(kpA);
    const { pubPem: pubB, nodeId: nodeIdB } = await nodeKeyMaterial(kpB);

    const dcA = generateDomainCertificate();
    const dcB = generateDomainCertificate();
    const domainIdA = dcA.cert.domainId;
    const domainIdB = dcB.cert.domainId;

    // Tamper signature but keep the rest intact.
    const badCertA: DomainCertificate = { ...dcA.cert, signature: 'not-a-real-signature' };

    const domains = new InMemoryDomainRegistry();
    domains.register(mkDomain(domainIdA, badCertA, [domainIdB], 'FULL'));
    domains.register(mkDomain(domainIdB, dcB.cert, [domainIdA], 'FULL'));

    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerPeer(peersA, nodeIdB, pubB, domainIdB);
    registerPeer(peersB, nodeIdA, pubA, domainIdA);

    const a = mkEngine(nodeIdA, 'a-secret');
    const b = mkEngine(nodeIdB, 'b-secret');
    appendAudit(a, 'e1', 1);

    const ma = new DistributedSyncManager(kpA, a, peersA, domains, domainIdA, {});
    const mb = new DistributedSyncManager(kpB, b, peersB, domains, domainIdB, {});

    await mb.receiveRoot(await ma.announceRoot());
    assert.strictEqual(mb.getSyncState(nodeIdA).lastKnownRoot, '');
  });

  it('3. domainId mismatch (certificate-domainId != msg-domainId): rejected', async () => {
    const kpA = new InMemoryEd25519KeyProvider();
    const kpB = new InMemoryEd25519KeyProvider();
    const { pubPem: pubA, nodeId: nodeIdA } = await nodeKeyMaterial(kpA);
    const { pubPem: pubB, nodeId: nodeIdB } = await nodeKeyMaterial(kpB);

    const dcA = generateDomainCertificate();
    const dcB = generateDomainCertificate();
    const domainIdA = dcA.cert.domainId;
    const domainIdB = dcB.cert.domainId;

    // Sender claims domainIdA but includes a certificate for domainIdB.
    const domains = new InMemoryDomainRegistry();
    domains.register(mkDomain(domainIdA, dcB.cert, [domainIdB], 'FULL')); // local domainIdA but cert domainIdB
    domains.register(mkDomain(domainIdB, dcB.cert, [domainIdA], 'FULL'));

    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerPeer(peersA, nodeIdB, pubB, domainIdB);
    registerPeer(peersB, nodeIdA, pubA, domainIdA);

    const a = mkEngine(nodeIdA, 'a-secret');
    const b = mkEngine(nodeIdB, 'b-secret');
    appendAudit(a, 'e1', 1);

    const ma = new DistributedSyncManager(kpA, a, peersA, domains, domainIdA, {});
    const mb = new DistributedSyncManager(kpB, b, peersB, domains, domainIdB, {});

    await mb.receiveRoot(await ma.announceRoot());
    assert.strictEqual(mb.getSyncState(nodeIdA).lastKnownRoot, '');
  });

  it('4. expired certificate: rejected', async () => {
    const kpA = new InMemoryEd25519KeyProvider();
    const kpB = new InMemoryEd25519KeyProvider();
    const { pubPem: pubA, nodeId: nodeIdA } = await nodeKeyMaterial(kpA);
    const { pubPem: pubB, nodeId: nodeIdB } = await nodeKeyMaterial(kpB);

    const now = Date.now();
    const dcAExpired = generateDomainCertificate(now - 5_000);
    const dcB = generateDomainCertificate();
    const domainIdA = dcAExpired.cert.domainId;
    const domainIdB = dcB.cert.domainId;

    const domains = new InMemoryDomainRegistry();
    domains.register(mkDomain(domainIdA, dcAExpired.cert, [domainIdB], 'FULL'));
    domains.register(mkDomain(domainIdB, dcB.cert, [domainIdA], 'FULL'));

    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerPeer(peersA, nodeIdB, pubB, domainIdB);
    registerPeer(peersB, nodeIdA, pubA, domainIdA);

    const a = mkEngine(nodeIdA, 'a-secret');
    const b = mkEngine(nodeIdB, 'b-secret');
    appendAudit(a, 'e1', 1);

    const ma = new DistributedSyncManager(kpA, a, peersA, domains, domainIdA, {});
    const mb = new DistributedSyncManager(kpB, b, peersB, domains, domainIdB, {});

    await mb.receiveRoot(await ma.announceRoot());
    assert.strictEqual(mb.getSyncState(nodeIdA).lastKnownRoot, '');
  });

  it('5. revoked domain: rejected', async () => {
    const kpA = new InMemoryEd25519KeyProvider();
    const kpB = new InMemoryEd25519KeyProvider();
    const { pubPem: pubA, nodeId: nodeIdA } = await nodeKeyMaterial(kpA);
    const { pubPem: pubB, nodeId: nodeIdB } = await nodeKeyMaterial(kpB);

    const dcA = generateDomainCertificate();
    const dcB = generateDomainCertificate();
    const domainIdA = dcA.cert.domainId;
    const domainIdB = dcB.cert.domainId;

    const domains = new InMemoryDomainRegistry();
    domains.register(mkDomain(domainIdA, dcA.cert, [domainIdB], 'FULL'));
    domains.register(mkDomain(domainIdB, dcB.cert, [domainIdA], 'FULL'));

    // Local (receiver) revokes the sender domain.
    domains.revokeDomain(domainIdA, Date.now() - 1_000, 'test-revocation');

    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerPeer(peersA, nodeIdB, pubB, domainIdB);
    registerPeer(peersB, nodeIdA, pubA, domainIdA);

    const a = mkEngine(nodeIdA, 'a-secret');
    const b = mkEngine(nodeIdB, 'b-secret');
    appendAudit(a, 'e1', 1);

    const ma = new DistributedSyncManager(kpA, a, peersA, domains, domainIdA, {});
    const mb = new DistributedSyncManager(kpB, b, peersB, domains, domainIdB, {});

    await mb.receiveRoot(await ma.announceRoot());
    assert.strictEqual(mb.getSyncState(nodeIdA).lastKnownRoot, '');
  });

  it('6. negotiation success: works', async () => {
    const kpA = new InMemoryEd25519KeyProvider();
    const kpB = new InMemoryEd25519KeyProvider();
    const { pubPem: pubA, nodeId: nodeIdA } = await nodeKeyMaterial(kpA);
    const { pubPem: pubB, nodeId: nodeIdB } = await nodeKeyMaterial(kpB);

    const dcA = generateDomainCertificate();
    const dcB = generateDomainCertificate();
    const domainIdA = dcA.cert.domainId;
    const domainIdB = dcB.cert.domainId;

    const domains = new InMemoryDomainRegistry();
    domains.register({
      ...mkDomain(domainIdA, dcA.cert, [domainIdB], 'FULL'),
      acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
      supportedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
    });
    domains.register({
      ...mkDomain(domainIdB, dcB.cert, [domainIdA], 'FULL'),
      acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
      supportedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
    });

    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerPeer(peersA, nodeIdB, pubB, domainIdB);
    registerPeer(peersB, nodeIdA, pubA, domainIdA);

    const a = mkEngine(nodeIdA, 'a-secret');
    const b = mkEngine(nodeIdB, 'b-secret');
    appendAudit(a, 'e1', 1);

    const ma = new DistributedSyncManager(kpA, a, peersA, domains, domainIdA, {});
    const mb = new DistributedSyncManager(kpB, b, peersB, domains, domainIdB, {});

    await mb.receiveRoot(await ma.announceRoot());
    const req = await mb.requestProof(nodeIdA, 0);
    const resp = await ma.createProofResponse(req);
    assert.ok(resp);
    await mb.receiveProofResponse(resp);
    assert.strictEqual(b.getAuditSnapshot().merkleRoot, a.getAuditSnapshot().merkleRoot);
  });

  it('7. negotiation failure: rejected', async () => {
    const kpA = new InMemoryEd25519KeyProvider();
    const kpB = new InMemoryEd25519KeyProvider();
    const { pubPem: pubA, nodeId: nodeIdA } = await nodeKeyMaterial(kpA);
    const { pubPem: pubB, nodeId: nodeIdB } = await nodeKeyMaterial(kpB);

    const dcA = generateDomainCertificate();
    const dcB = generateDomainCertificate();
    const domainIdA = dcA.cert.domainId;
    const domainIdB = dcB.cert.domainId;

    const domains = new InMemoryDomainRegistry();
    domains.register(mkDomain(domainIdA, dcA.cert, [domainIdB], 'FULL'));
    domains.register({
      ...mkDomain(domainIdB, dcB.cert, [domainIdA], 'FULL'),
      // Force empty accepted list on receiver, making negotiation impossible.
      acceptedCanonicalIdentities: [] as any,
      supportedCanonicalIdentities: [] as any,
    });

    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerPeer(peersA, nodeIdB, pubB, domainIdB);
    registerPeer(peersB, nodeIdA, pubA, domainIdA);

    const a = mkEngine(nodeIdA, 'a-secret');
    const b = mkEngine(nodeIdB, 'b-secret');
    appendAudit(a, 'e1', 1);

    const ma = new DistributedSyncManager(kpA, a, peersA, domains, domainIdA, {});
    const mb = new DistributedSyncManager(kpB, b, peersB, domains, domainIdB, {});

    await mb.receiveRoot(await ma.announceRoot());
    assert.strictEqual(mb.getSyncState(nodeIdA).lastKnownRoot, '');
  });

  it('8. trust level enforcement differs: PARTIAL denies proof exchange', async () => {
    const kpA = new InMemoryEd25519KeyProvider();
    const kpB = new InMemoryEd25519KeyProvider();
    const { pubPem: pubA, nodeId: nodeIdA } = await nodeKeyMaterial(kpA);
    const { pubPem: pubB, nodeId: nodeIdB } = await nodeKeyMaterial(kpB);

    const dcA = generateDomainCertificate();
    const dcB = generateDomainCertificate();
    const domainIdA = dcA.cert.domainId;
    const domainIdB = dcB.cert.domainId;

    const domains = new InMemoryDomainRegistry();
    domains.register(mkDomain(domainIdA, dcA.cert, [domainIdB], 'PARTIAL')); // sender domain denies proof request handling
    domains.register(mkDomain(domainIdB, dcB.cert, [domainIdA], 'FULL'));

    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerPeer(peersA, nodeIdB, pubB, domainIdB);
    registerPeer(peersB, nodeIdA, pubA, domainIdA);

    const a = mkEngine(nodeIdA, 'a-secret');
    const b = mkEngine(nodeIdB, 'b-secret');
    appendAudit(a, 'e1', 1);

    const ma = new DistributedSyncManager(kpA, a, peersA, domains, domainIdA, {});
    const mb = new DistributedSyncManager(kpB, b, peersB, domains, domainIdB, {});

    await mb.receiveRoot(await ma.announceRoot());
    const req = await mb.requestProof(nodeIdA, 0);
    const resp = await ma.createProofResponse(req);
    assert.strictEqual(resp, null);
  });

  it('9. malicious certificate injection: rejected', async () => {
    const kpA = new InMemoryEd25519KeyProvider();
    const kpB = new InMemoryEd25519KeyProvider();
    const { pubPem: pubA, nodeId: nodeIdA } = await nodeKeyMaterial(kpA);
    const { pubPem: pubB, nodeId: nodeIdB } = await nodeKeyMaterial(kpB);

    const dcA = generateDomainCertificate();
    const dcB = generateDomainCertificate();

    const domainIdA = dcA.cert.domainId;
    const domainIdB = dcB.cert.domainId;

    const domains = new InMemoryDomainRegistry();
    // Sender (domainIdA) is configured with a certificate from domainIdB.
    domains.register(mkDomain(domainIdA, dcB.cert, [domainIdB], 'FULL'));
    domains.register(mkDomain(domainIdB, dcB.cert, [domainIdA], 'FULL'));

    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerPeer(peersA, nodeIdB, pubB, domainIdB);
    registerPeer(peersB, nodeIdA, pubA, domainIdA);

    const a = mkEngine(nodeIdA, 'a-secret');
    const b = mkEngine(nodeIdB, 'b-secret');
    appendAudit(a, 'e1', 1);

    const ma = new DistributedSyncManager(kpA, a, peersA, domains, domainIdA, {});
    const mb = new DistributedSyncManager(kpB, b, peersB, domains, domainIdB, {});

    await mb.receiveRoot(await ma.announceRoot());
    assert.strictEqual(mb.getSyncState(nodeIdA).lastKnownRoot, '');
  });
});

