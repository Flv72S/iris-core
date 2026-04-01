import assert from 'node:assert';
import { describe, it } from 'node:test';

import { ControlPlaneRegistry } from '../control_plane_registry.js';
import { DistributedSyncManager } from '../distributed_sync.js';
import { deriveNodeId } from '../identity/node_identity.js';
import { DEFAULT_CANONICAL_IDENTITY } from '../identity/canonical_identity.js';
import { InMemoryDomainRegistry } from '../domain_registry_memory.js';
import type { TrustDomain } from '../trust_domain.js';
import { HmacLegacyKeyProvider } from '../keys/hmac_legacy_provider.js';
import { InMemoryEd25519KeyProvider } from '../keys/in_memory_key_provider.js';
import { InMemoryPeerRegistry } from '../peer_registry_memory.js';
import {
  signProtocolMessageLegacySync,
  verifyProtocolMessage,
} from '../trust_sync_protocol_sign.js';
import { TrustSyncEngine } from '../trust_sync_engine.js';

const LEGACY = 'legacy-hmac-shared-secret-012345678901234567890';
const LOCAL_DOMAIN_ID = 'domain-A';

function mkDomainRegistry(): InMemoryDomainRegistry {
  const reg = new InMemoryDomainRegistry();
  const d: TrustDomain = {
    domainId: LOCAL_DOMAIN_ID,
    name: LOCAL_DOMAIN_ID,
    acceptedCanonicalIdentities: [DEFAULT_CANONICAL_IDENTITY],
    trustedPeers: [],
    trustedDomains: [],
    allowCrossDomainSync: false,
    trustLevel: 'FULL',
  };
  reg.register(d);
  return reg;
}

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

describe('Multi-key security (16F.X1.X2)', () => {
  it('legacy HMAC protocol envelope verifies without signerPublicKey', async () => {
    const kp = new HmacLegacyKeyProvider(LEGACY);
    const body = { nodeId: 'N1', merkleRoot: 'r', totalRecords: 0, timestamp: 1 };
    const signed = { ...body, signature: signProtocolMessageLegacySync(body, LEGACY) };
    const ok = await verifyProtocolMessage(signed, kp, { legacySharedSecret: LEGACY });
    assert.strictEqual(ok, true);
  });

  it('Ed25519: nodeId must match deriveNodeId(protocol public key)', async () => {
    const kp = new InMemoryEd25519KeyProvider();
    const protocolPub = (await kp.getKey('protocol_signing'))!.publicKey;
    const nodeId = deriveNodeId(protocolPub);
    const engine = mkEngine(nodeId, 'local-secret-012345678901234567890');
    const peers = new InMemoryPeerRegistry();
    peers.register({ nodeId, publicKey: protocolPub, trusted: true });
    const sync = new DistributedSyncManager(kp, engine, peers, mkDomainRegistry(), LOCAL_DOMAIN_ID, {});
    const ann = await sync.announceRoot();
    assert.ok(ann.signerPublicKey && ann.signerPublicKey.length > 0);
    const ok = await verifyProtocolMessage(ann, kp, {});
    assert.strictEqual(ok, true);
  });

  it('rejects peer when signerPublicKey does not match registry', async () => {
    const kp = new InMemoryEd25519KeyProvider();
    const protocolPub = (await kp.getKey('protocol_signing'))!.publicKey;
    const nodeId = deriveNodeId(protocolPub);
    const engine = mkEngine(nodeId, 'local-secret-012345678901234567890');
    const peers = new InMemoryPeerRegistry();
    peers.register({ nodeId, publicKey: 'wrong-public-key-pem', trusted: true });
    const sync = new DistributedSyncManager(kp, engine, peers, mkDomainRegistry(), LOCAL_DOMAIN_ID, {});
    const ann = await sync.announceRoot();

    const receiverPeers = new InMemoryPeerRegistry();
    receiverPeers.register({ nodeId, publicKey: 'wrong-public-key-pem', trusted: true });
    const syncB = new DistributedSyncManager(
      kp,
      mkEngine('other', 's'),
      receiverPeers,
      mkDomainRegistry(),
      LOCAL_DOMAIN_ID,
      {},
    );
    await syncB.receiveRoot(ann);
    assert.strictEqual(syncB.getSyncState(nodeId).lastKnownRoot, '');
  });

  it('untrusted peer announcement is ignored', async () => {
    const kp = new HmacLegacyKeyProvider(LEGACY);
    const a = mkEngine('A', 'a-secret-012345678901234567890');
    const b = mkEngine('B', 'b-secret-012345678901234567890');
    const peersB = new InMemoryPeerRegistry();
    const mb = new DistributedSyncManager(kp, b, peersB, mkDomainRegistry(), LOCAL_DOMAIN_ID, {
      legacySharedSecret: LEGACY,
    });
    const peersA = new InMemoryPeerRegistry();
    const ma = new DistributedSyncManager(kp, a, peersA, mkDomainRegistry(), LOCAL_DOMAIN_ID, {
      legacySharedSecret: LEGACY,
    });
    await mb.receiveRoot(await ma.announceRoot());
    assert.strictEqual(mb.getSyncState('A').lastKnownRoot, '');
  });

  it('revoked peer is ignored', async () => {
    const kp = new HmacLegacyKeyProvider(LEGACY);
    const a = mkEngine('A', 'a-secret-012345678901234567890');
    const b = mkEngine('B', 'b-secret-012345678901234567890');
    const peersB = new InMemoryPeerRegistry();
    peersB.register({ nodeId: 'A', publicKey: '', trusted: true });
    peersB.revoke('A');
    const mb = new DistributedSyncManager(kp, b, peersB, mkDomainRegistry(), LOCAL_DOMAIN_ID, {
      legacySharedSecret: LEGACY,
    });

    const peersA = new InMemoryPeerRegistry();
    peersA.register({ nodeId: 'B', publicKey: '', trusted: true });
    const ma = new DistributedSyncManager(kp, a, peersA, mkDomainRegistry(), LOCAL_DOMAIN_ID, {
      legacySharedSecret: LEGACY,
    });
    await mb.receiveRoot(await ma.announceRoot());
    assert.strictEqual(mb.getSyncState('A').lastKnownRoot, '');
  });
});
