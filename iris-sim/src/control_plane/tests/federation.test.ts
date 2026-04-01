import assert from 'node:assert';
import { describe, it } from 'node:test';

import { ControlPlaneRegistry } from '../control_plane_registry.js';
import { DistributedSyncManager } from '../distributed_sync.js';
import { InMemoryDomainRegistry } from '../domain_registry_memory.js';
import type { TrustDomain } from '../trust_domain.js';
import { InMemoryPeerRegistry } from '../peer_registry_memory.js';
import { InMemoryEd25519KeyProvider } from '../keys/in_memory_key_provider.js';
import { signProtocolMessage, verifyProtocolMessage } from '../trust_sync_protocol_sign.js';
import { deriveNodeId } from '../identity/node_identity.js';
import { TrustSyncEngine } from '../trust_sync_engine.js';
import { DEFAULT_CANONICAL_IDENTITY } from '../identity/canonical_identity.js';

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

function mkDomainReg(config: Partial<TrustDomain> & { domainId: string }): InMemoryDomainRegistry {
  const reg = new InMemoryDomainRegistry();
  const base: TrustDomain = {
    domainId: config.domainId,
    name: config.name ?? config.domainId,
    acceptedCanonicalIdentities: config.acceptedCanonicalIdentities ?? [DEFAULT_CANONICAL_IDENTITY],
    trustedPeers: config.trustedPeers ?? [],
    trustedDomains: config.trustedDomains ?? [],
    allowCrossDomainSync: config.allowCrossDomainSync ?? false,
    trustLevel: config.trustLevel ?? 'FULL',
  };
  reg.register(base);
  return reg;
}

function registerPeer(reg: InMemoryPeerRegistry, peer: { nodeId: string; publicKey: string; domainId: string }): void {
  reg.register({ nodeId: peer.nodeId, publicKey: peer.publicKey, trusted: true, domainId: peer.domainId });
}

async function makeAnn(params: {
  keyProvider: InMemoryEd25519KeyProvider;
  nodeId: string;
  merkleRoot: string;
  totalRecords: number;
  timestamp: number;
  signerPublicKey: string;
  domainId: string;
  canonicalIdentity: string;
}): Promise<any> {
  const payload = {
    nodeId: params.nodeId,
    merkleRoot: params.merkleRoot,
    totalRecords: params.totalRecords,
    timestamp: params.timestamp,
    signerPublicKey: params.signerPublicKey,
    domainId: params.domainId,
    canonicalIdentity: params.canonicalIdentity,
  };
  const signature = await signProtocolMessage(payload, params.keyProvider);
  return { ...payload, signature };
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

describe('Federation layer (16F.X4)', () => {
  it('same domain sync: allowed', async () => {
    const domainA = 'A';
    const localDomainId = domainA;
    const domains = mkDomainReg({
      domainId: localDomainId,
      allowCrossDomainSync: false,
      trustedDomains: [],
    });
    // remote domain must exist even for same-domain enforcement (defensive)
    domains.register({
      domainId: localDomainId,
      name: localDomainId,
      acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
      trustedPeers: [],
      trustedDomains: [],
      allowCrossDomainSync: false,
      trustLevel: 'FULL',
    });

    const kpA = new InMemoryEd25519KeyProvider();
    const pubA = (await kpA.getKey('protocol_signing'))!.publicKey;
    const nodeIdA = deriveNodeId(pubA);

    const kpB = new InMemoryEd25519KeyProvider();
    const pubB = (await kpB.getKey('protocol_signing'))!.publicKey;
    const nodeIdB = deriveNodeId(pubB);

    const a = mkEngine(nodeIdA, 'a-secret');
    const b = mkEngine(nodeIdB, 'b-secret');
    appendAudit(a, 'e1', 1);

    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerPeer(peersA, { nodeId: nodeIdB, publicKey: pubB, domainId: domainA });
    registerPeer(peersB, { nodeId: nodeIdA, publicKey: pubA, domainId: domainA });

    const ma = new DistributedSyncManager(kpA, a, peersA, domains, domainA, {});
    const mb = new DistributedSyncManager(kpB, b, peersB, domains, domainA, {});

    await mb.receiveRoot(await ma.announceRoot());
    const req = await mb.requestProof(nodeIdA, 0);
    const resp = await ma.createProofResponse(req);
    assert.ok(resp);
    await mb.receiveProofResponse(resp);
    assert.strictEqual(b.getAuditSnapshot().merkleRoot, a.getAuditSnapshot().merkleRoot);
  });

  it('cross-domain allowed: sync works', async () => {
    const domainA = 'A';
    const domainB = 'B';
    const domains = new InMemoryDomainRegistry();
    domains.register({
      domainId: domainA,
      name: domainA,
      acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
      trustedPeers: [],
      trustedDomains: [domainB],
      allowCrossDomainSync: true,
      trustLevel: 'FULL',
    });
    domains.register({
      domainId: domainB,
      name: domainB,
      acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
      trustedPeers: [],
      trustedDomains: [domainA],
      allowCrossDomainSync: true,
      trustLevel: 'FULL',
    });

    const kpA = new InMemoryEd25519KeyProvider();
    const pubA = (await kpA.getKey('protocol_signing'))!.publicKey;
    const nodeIdA = deriveNodeId(pubA);

    const kpB = new InMemoryEd25519KeyProvider();
    const pubB = (await kpB.getKey('protocol_signing'))!.publicKey;
    const nodeIdB = deriveNodeId(pubB);

    const a = mkEngine(nodeIdA, 'a-secret');
    const b = mkEngine(nodeIdB, 'b-secret');
    appendAudit(a, 'e1', 1);

    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerPeer(peersA, { nodeId: nodeIdB, publicKey: pubB, domainId: domainB });
    registerPeer(peersB, { nodeId: nodeIdA, publicKey: pubA, domainId: domainA });

    const ma = new DistributedSyncManager(kpA, a, peersA, domains, domainA, {});
    const mb = new DistributedSyncManager(kpB, b, peersB, domains, domainB, {});

    const ann = await ma.announceRoot();
    assert.strictEqual(ann.nodeId, nodeIdA);
    await mb.receiveRoot(ann);
    assert.strictEqual(mb.getSyncState(nodeIdA).lastKnownRoot, a.getAuditSnapshot().merkleRoot);
    const req = await mb.requestProof(nodeIdA, 0);
    assert.strictEqual(req.expectedRoot, a.getAuditSnapshot().merkleRoot);
    assert.strictEqual(req.recordIndex, 0);
    assert.ok(await verifyProtocolMessage(req, kpA, {}));
    assert.strictEqual(a.getAuditLog().getProofForRecord(0).root, a.getAuditSnapshot().merkleRoot);
    assert.strictEqual(req.targetNodeId, nodeIdA);
    assert.strictEqual(a.getAuditLog().getAll().length, 1);
    const rejectedBefore = ma.getObservabilityFederation().rejectedByPolicy;
    const resp = await ma.createProofResponse(req);
    const rejectedAfter = ma.getObservabilityFederation().rejectedByPolicy;
    assert.strictEqual(rejectedAfter, rejectedBefore);
    assert.ok(resp);
    await mb.receiveProofResponse(resp);
    assert.strictEqual(b.getAuditSnapshot().merkleRoot, a.getAuditSnapshot().merkleRoot);
  });

  it('cross-domain forbidden: rejected', async () => {
    const domainA = 'A';
    const domainB = 'B';
    const domains = new InMemoryDomainRegistry();
    domains.register({
      domainId: domainA,
      name: domainA,
      acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
      trustedPeers: [],
      trustedDomains: [],
      allowCrossDomainSync: false,
      trustLevel: 'FULL',
    });
    domains.register({
      domainId: domainB,
      name: domainB,
      acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
      trustedPeers: [],
      trustedDomains: [],
      allowCrossDomainSync: false,
      trustLevel: 'FULL',
    });

    const kpA = new InMemoryEd25519KeyProvider();
    const pubA = (await kpA.getKey('protocol_signing'))!.publicKey;
    const nodeIdA = deriveNodeId(pubA);

    const kpB = new InMemoryEd25519KeyProvider();
    const pubB = (await kpB.getKey('protocol_signing'))!.publicKey;
    const nodeIdB = deriveNodeId(pubB);

    const a = mkEngine(nodeIdA, 'a-secret');
    const b = mkEngine(nodeIdB, 'b-secret');
    appendAudit(a, 'e1', 1);

    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerPeer(peersA, { nodeId: nodeIdB, publicKey: pubB, domainId: domainB });
    registerPeer(peersB, { nodeId: nodeIdA, publicKey: pubA, domainId: domainA });

    const ma = new DistributedSyncManager(kpA, a, peersA, domains, domainA, {});
    const mb = new DistributedSyncManager(kpB, b, peersB, domains, domainB, {});

    await mb.receiveRoot(await ma.announceRoot());
    assert.strictEqual(mb.getSyncState(nodeIdA).lastKnownRoot, '');
  });

  it('unsupported canonical identity: rejected', async () => {
    const domainA = 'A';
    const domainB = 'B';
    const domains = new InMemoryDomainRegistry();
    domains.register({
      domainId: domainA,
      name: domainA,
      acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
      trustedPeers: [],
      trustedDomains: [domainB],
      allowCrossDomainSync: true,
      trustLevel: 'FULL',
    });
    domains.register({
      domainId: domainB,
      name: domainB,
      acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
      trustedPeers: [],
      trustedDomains: [],
      allowCrossDomainSync: false,
      trustLevel: 'FULL',
    });

    const kpA = new InMemoryEd25519KeyProvider();
    const pubA = (await kpA.getKey('protocol_signing'))!.publicKey;
    const nodeIdA = deriveNodeId(pubA);

    const kpB = new InMemoryEd25519KeyProvider();
    const pubB = (await kpB.getKey('protocol_signing'))!.publicKey;
    const nodeIdB = deriveNodeId(pubB);

    const a = mkEngine(nodeIdA, 'a-secret');
    const b = mkEngine(nodeIdB, 'b-secret');
    appendAudit(a, 'e1', 1);

    const peersB = new InMemoryPeerRegistry();
    registerPeer(peersB, { nodeId: nodeIdA, publicKey: pubA, domainId: domainA });

    const mb = new DistributedSyncManager(kpB, b, peersB, domains, domainB, {});
    const snapA = a.getAuditSnapshot();
    const badCanon = 'unknown_canonical_identity';
    const ann = await makeAnn({
      keyProvider: kpA,
      nodeId: nodeIdA,
      merkleRoot: snapA.merkleRoot,
      totalRecords: snapA.totalRecords,
      timestamp: Date.now(),
      signerPublicKey: pubA,
      domainId: domainA,
      canonicalIdentity: badCanon,
    });

    await mb.receiveRoot(ann);
    assert.strictEqual(mb.getSyncState(nodeIdA).lastKnownRoot, '');
  });

  it('revoked peer: rejected', async () => {
    const domainA = 'A';
    const domainB = 'B';
    const domains = new InMemoryDomainRegistry();
    domains.register({
      domainId: domainA,
      name: domainA,
      acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
      trustedPeers: [],
      trustedDomains: [domainB],
      allowCrossDomainSync: true,
      trustLevel: 'FULL',
    });
    domains.register({
      domainId: domainB,
      name: domainB,
      acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
      trustedPeers: [],
      trustedDomains: [domainA],
      allowCrossDomainSync: true,
      trustLevel: 'FULL',
    });

    const kpA = new InMemoryEd25519KeyProvider();
    const pubA = (await kpA.getKey('protocol_signing'))!.publicKey;
    const nodeIdA = deriveNodeId(pubA);

    const kpB = new InMemoryEd25519KeyProvider();
    const pubB = (await kpB.getKey('protocol_signing'))!.publicKey;
    const nodeIdB = deriveNodeId(pubB);

    const a = mkEngine(nodeIdA, 'a-secret');
    const b = mkEngine(nodeIdB, 'b-secret');
    appendAudit(a, 'e1', 1);

    const peersB = new InMemoryPeerRegistry();
    registerPeer(peersB, { nodeId: nodeIdA, publicKey: pubA, domainId: domainA });
    peersB.revoke(nodeIdA);

    const mb = new DistributedSyncManager(kpB, b, peersB, domains, domainB, {});
    const ma = new DistributedSyncManager(kpA, a, new InMemoryPeerRegistry(), domains, domainA, {});

    await mb.receiveRoot(await ma.announceRoot());
    assert.strictEqual(mb.getSyncState(nodeIdA).lastKnownRoot, '');
  });

  it('multi-domain convergence: nodes converge across trusted domains', async () => {
    const domains = new InMemoryDomainRegistry();
    for (const [id, trust] of [
      ['A', ['B', 'C']],
      ['B', ['A', 'C']],
      ['C', ['A', 'B']],
    ] as const) {
      domains.register({
        domainId: id,
        name: id,
        acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
        trustedPeers: [],
        trustedDomains: trust as unknown as string[],
        allowCrossDomainSync: true,
        trustLevel: 'FULL',
      });
    }

    const kpA = new InMemoryEd25519KeyProvider();
    const pubA = (await kpA.getKey('protocol_signing'))!.publicKey;
    const nodeIdA = deriveNodeId(pubA);
    const a = mkEngine(nodeIdA, 'a-secret');
    appendAudit(a, 'e1', 1);
    appendAudit(a, 'e2', 2);
    appendAudit(a, 'e3', 3);

    const kpB = new InMemoryEd25519KeyProvider();
    const pubB = (await kpB.getKey('protocol_signing'))!.publicKey;
    const nodeIdB = deriveNodeId(pubB);
    const b = mkEngine(nodeIdB, 'b-secret');

    const kpC = new InMemoryEd25519KeyProvider();
    const pubC = (await kpC.getKey('protocol_signing'))!.publicKey;
    const nodeIdC = deriveNodeId(pubC);
    const c = mkEngine(nodeIdC, 'c-secret');

    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    const peersC = new InMemoryPeerRegistry();

    registerPeer(peersA, { nodeId: nodeIdB, publicKey: pubB, domainId: 'B' });
    registerPeer(peersA, { nodeId: nodeIdC, publicKey: pubC, domainId: 'C' });
    registerPeer(peersB, { nodeId: nodeIdA, publicKey: pubA, domainId: 'A' });
    registerPeer(peersC, { nodeId: nodeIdA, publicKey: pubA, domainId: 'A' });

    const ma = new DistributedSyncManager(kpA, a, peersA, domains, 'A', {});
    const mb = new DistributedSyncManager(kpB, b, peersB, domains, 'B', {});
    const mc = new DistributedSyncManager(kpC, c, peersC, domains, 'C', {});

    await mb.receiveRoot(await ma.announceRoot());
    for (const idx of [0, 1, 2]) {
      const req = await mb.requestProof(nodeIdA, idx);
      const resp = await ma.createProofResponse(req);
      assert.ok(resp);
      await mb.receiveProofResponse(resp);
    }

    await mc.receiveRoot(await ma.announceRoot());
    for (const idx of [0, 1, 2]) {
      const req = await mc.requestProof(nodeIdA, idx);
      const resp = await ma.createProofResponse(req);
      assert.ok(resp);
      await mc.receiveProofResponse(resp);
    }

    assert.strictEqual(b.getAuditSnapshot().merkleRoot, a.getAuditSnapshot().merkleRoot);
    assert.strictEqual(c.getAuditSnapshot().merkleRoot, a.getAuditSnapshot().merkleRoot);
  });

  it('malicious domain spoof: rejected', async () => {
    const domainA = 'A';
    const domainB = 'B';
    const domainC = 'C';
    const domains = new InMemoryDomainRegistry();
    domains.register({
      domainId: domainB,
      name: domainB,
      acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
      trustedPeers: [],
      trustedDomains: [domainC],
      allowCrossDomainSync: true,
      trustLevel: 'FULL',
    });
    domains.register({
      domainId: domainC,
      name: domainC,
      acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
      trustedPeers: [],
      trustedDomains: [domainB],
      allowCrossDomainSync: true,
      trustLevel: 'FULL',
    });

    const kpC = new InMemoryEd25519KeyProvider();
    const pubC = (await kpC.getKey('protocol_signing'))!.publicKey;
    const nodeIdC = deriveNodeId(pubC);

    const kpB = new InMemoryEd25519KeyProvider();
    const pubB = (await kpB.getKey('protocol_signing'))!.publicKey;
    const nodeIdB = deriveNodeId(pubB);

    const c = mkEngine(nodeIdC, 'c-secret');
    appendAudit(c, 'e1', 1);
    const b = mkEngine(nodeIdB, 'b-secret');

    const peersB = new InMemoryPeerRegistry();
    registerPeer(peersB, { nodeId: nodeIdC, publicKey: pubC, domainId: domainC });

    const mb = new DistributedSyncManager(kpB, b, peersB, domains, domainB, {});
    const snapC = c.getAuditSnapshot();
    const spoofedDomainId = domainA; // B expects C, attacker claims A
    const ann = await makeAnn({
      keyProvider: kpC,
      nodeId: nodeIdC,
      merkleRoot: snapC.merkleRoot,
      totalRecords: snapC.totalRecords,
      timestamp: Date.now(),
      signerPublicKey: pubC,
      domainId: spoofedDomainId,
      canonicalIdentity: DEFAULT_CANONICAL_IDENTITY,
    });
    await mb.receiveRoot(ann);
    assert.strictEqual(mb.getSyncState(nodeIdC).lastKnownRoot, '');
  });
});

