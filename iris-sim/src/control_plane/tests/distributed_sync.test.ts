import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { ControlPlaneRegistry } from '../control_plane_registry.js';
import { DistributedSyncManager } from '../distributed_sync.js';
import { HmacLegacyKeyProvider } from '../keys/hmac_legacy_provider.js';
import { InMemoryPeerRegistry } from '../peer_registry_memory.js';
import { InMemoryDomainRegistry } from '../domain_registry_memory.js';
import type { TrustDomain } from '../trust_domain.js';
import { TrustSyncEngine } from '../trust_sync_engine.js';
import { signProtocolMessageLegacySync, verifyProtocolMessageLegacySync } from '../trust_sync_protocol_sign.js';
import { DEFAULT_CANONICAL_IDENTITY } from '../identity/canonical_identity.js';

const PROTO = 'sync-protocol-hmac-secret-01234567890123456789';
const LOCAL_DOMAIN_ID = 'domain-A';

function mkDomainRegistry(trustedDomains: string[] = []): InMemoryDomainRegistry {
  const reg = new InMemoryDomainRegistry();
  const d: TrustDomain = {
    domainId: LOCAL_DOMAIN_ID,
    name: LOCAL_DOMAIN_ID,
    acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
    trustedPeers: [],
    trustedDomains,
    allowCrossDomainSync: false,
    trustLevel: 'FULL',
  };
  reg.register(d);
  return reg;
}

function registerBidirectional(
  regA: InMemoryPeerRegistry,
  regB: InMemoryPeerRegistry,
  idA: string,
  idB: string,
): void {
  regA.register({ nodeId: idB, publicKey: '', trusted: true });
  regB.register({ nodeId: idA, publicKey: '', trusted: true });
}

function mkEngine(id: string, secret: string): TrustSyncEngine {
  return new TrustSyncEngine({
    localNodeId: id,
    localSecret: secret,
    registry: new ControlPlaneRegistry(),
    resolveIssuerSecret: () => undefined,
    send: () => {},
    now: () => 10_000,
  });
}

function mkSync(engine: TrustSyncEngine, peers: InMemoryPeerRegistry, domainRegistry: InMemoryDomainRegistry): DistributedSyncManager {
  return new DistributedSyncManager(new HmacLegacyKeyProvider(PROTO), engine, peers, domainRegistry, LOCAL_DOMAIN_ID, {
    legacySharedSecret: PROTO,
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

describe('Distributed proof exchange (16F.X3)', () => {
  it('root exchange: two nodes update sync state', async () => {
    const a = mkEngine('A', 'a-node-secret-012345678901234567890');
    const b = mkEngine('B', 'b-node-secret-012345678901234567890');
    appendAudit(a, 'e1', 1);
    appendAudit(b, 'e1', 1);
    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerBidirectional(peersA, peersB, 'A', 'B');
    const domains = mkDomainRegistry();
    const ma = mkSync(a, peersA, domains);
    const mb = mkSync(b, peersB, domains);
    await mb.receiveRoot(await ma.announceRoot());
    const st = mb.getSyncState('A');
    assert.strictEqual(st.lastKnownRoot, a.getAuditSnapshot().merkleRoot);
    assert.strictEqual(st.divergenceDetected, false);
  });

  it('divergence detection: different logs flagged', async () => {
    const a = mkEngine('A', 'a-node-secret-012345678901234567890');
    const b = mkEngine('B', 'b-node-secret-012345678901234567890');
    appendAudit(a, 'e1', 1);
    appendAudit(a, 'e2', 2);
    appendAudit(b, 'e1', 1);
    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerBidirectional(peersA, peersB, 'A', 'B');
    const domains = mkDomainRegistry();
    const ma = mkSync(a, peersA, domains);
    const mb = mkSync(b, peersB, domains);
    const ann = await ma.announceRoot();
    await mb.receiveRoot(ann);
    assert.strictEqual(mb.getSyncState('A').divergenceDetected, true);
    assert.strictEqual(mb.detectDivergence(ann), true);
    assert.strictEqual(ma.detectDivergence(ann), false);
  });

  it('proof sync: responder produces verifiable envelope', async () => {
    const a = mkEngine('A', 'a-node-secret-012345678901234567890');
    const b = mkEngine('B', 'b-node-secret-012345678901234567890');
    appendAudit(a, 'e1', 1);
    appendAudit(a, 'e2', 2);
    appendAudit(b, 'e1', 1);
    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerBidirectional(peersA, peersB, 'A', 'B');
    const domains = mkDomainRegistry();
    const ma = mkSync(a, peersA, domains);
    const mb = mkSync(b, peersB, domains);
    await mb.receiveRoot(await ma.announceRoot());
    const req = await mb.requestProof('A', 1);
    const resp = await ma.createProofResponse(req);
    assert.ok(resp);
    assert.strictEqual(verifyProtocolMessageLegacySync(resp!, resp!.signature, PROTO), true);
  });

  it('incremental convergence: missing record appended via replica', async () => {
    const a = mkEngine('A', 'a-node-secret-012345678901234567890');
    const b = mkEngine('B', 'b-node-secret-012345678901234567890');
    appendAudit(a, 'e1', 1);
    appendAudit(a, 'e2', 2);
    appendAudit(b, 'e1', 1);
    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerBidirectional(peersA, peersB, 'A', 'B');
    const domains = mkDomainRegistry();
    const ma = mkSync(a, peersA, domains);
    const mb = mkSync(b, peersB, domains);
    await mb.receiveRoot(await ma.announceRoot());
    const req = await mb.requestProof('A', 1);
    const resp = await ma.createProofResponse(req);
    assert.ok(resp);
    await mb.receiveProofResponse(resp!);
    assert.strictEqual(b.getAuditSnapshot().merkleRoot, a.getAuditSnapshot().merkleRoot);
    assert.strictEqual(b.getAuditLog().getAll().length, 2);
  });

  it('malicious tampered proof is rejected', async () => {
    const a = mkEngine('A', 'a-node-secret-012345678901234567890');
    const b = mkEngine('B', 'b-node-secret-012345678901234567890');
    appendAudit(a, 'e1', 1);
    appendAudit(a, 'e2', 2);
    appendAudit(b, 'e1', 1);
    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerBidirectional(peersA, peersB, 'A', 'B');
    const domains = mkDomainRegistry();
    const ma = mkSync(a, peersA, domains);
    const mb = mkSync(b, peersB, domains);
    await mb.receiveRoot(await ma.announceRoot());
    const req = await mb.requestProof('A', 1);
    const resp = (await ma.createProofResponse(req))!;
    const tamperedBody = {
      responderNodeId: resp.responderNodeId,
      proof: { ...resp.proof, steps: resp.proof.steps.map((s) => ({ ...s, hash: `${s.hash}00` })) },
      record: resp.record,
      timestamp: resp.timestamp,
    };
    const tampered = { ...tamperedBody, signature: signProtocolMessageLegacySync(tamperedBody, PROTO) };
    await mb.receiveProofResponse(tampered);
    assert.strictEqual(b.getAuditLog().getAll().length, 1);
  });

  it('invalid root announcement signature is rejected', async () => {
    const a = mkEngine('A', 'a-node-secret-012345678901234567890');
    const b = mkEngine('B', 'b-node-secret-012345678901234567890');
    appendAudit(a, 'e1', 1);
    appendAudit(b, 'e1', 1);
    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerBidirectional(peersA, peersB, 'A', 'B');
    const domains = mkDomainRegistry();
    const ma = mkSync(a, peersA, domains);
    const mb = mkSync(b, peersB, domains);
    const ann = await ma.announceRoot();
    await mb.receiveRoot({ ...ann, signature: 'aa' });
    assert.strictEqual(mb.getSyncState('A').lastKnownRoot, '');
  });

  it('multi-node: delayed peer converges to same root via proofs', async () => {
    const a = mkEngine('A', 'a-node-secret-012345678901234567890');
    const c = mkEngine('C', 'c-node-secret-012345678901234567890');
    appendAudit(a, 'e1', 1);
    appendAudit(a, 'e2', 2);
    appendAudit(a, 'e3', 3);
    appendAudit(c, 'e1', 1);
    const peersA = new InMemoryPeerRegistry();
    const peersC = new InMemoryPeerRegistry();
    registerBidirectional(peersA, peersC, 'A', 'C');
    const domains = mkDomainRegistry();
    const ma = mkSync(a, peersA, domains);
    const mc = mkSync(c, peersC, domains);
    await mc.receiveRoot(await ma.announceRoot());
    for (const idx of [1, 2]) {
      const req = await mc.requestProof('A', idx);
      const resp = await ma.createProofResponse(req);
      assert.ok(resp);
      await mc.receiveProofResponse(resp!);
    }
    assert.strictEqual(c.getAuditSnapshot().merkleRoot, a.getAuditSnapshot().merkleRoot);
    assert.strictEqual(c.getAuditLog().getAll().length, 3);
  });

  it('persist metrics when configureMetricsPersistence is set', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-sync-metrics-'));
    const a = mkEngine('A', 'a-node-secret-012345678901234567890');
    const b = mkEngine('B', 'b-node-secret-012345678901234567890');
    appendAudit(a, 'e1', 1);
    appendAudit(b, 'e1', 1);
    const peersA = new InMemoryPeerRegistry();
    const peersB = new InMemoryPeerRegistry();
    registerBidirectional(peersA, peersB, 'A', 'B');
    const domains = mkDomainRegistry();
    const ma = mkSync(a, peersA, domains);
    const mb = mkSync(b, peersB, domains);
    mb.configureMetricsPersistence(tmp);
    await mb.receiveRoot(await ma.announceRoot());
    const raw = JSON.parse(fs.readFileSync(path.join(tmp, '.iris', 'sync_metrics.json'), 'utf8')) as {
      peers: number;
    };
    assert.strictEqual(raw.peers >= 1, true);
  });
});
