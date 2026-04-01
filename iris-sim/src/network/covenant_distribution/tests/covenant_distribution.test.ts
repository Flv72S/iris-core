/**
 * Microstep 14R — Distribution & Sync Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateKeyPairSync } from 'node:crypto';
import { CovenantPersistenceStore } from '../../covenant_persistence/index.js';
import { buildCovenantSnapshot } from '../../covenant_persistence/index.js';
import { CovenantLoader } from '../../covenant_dsl/index.js';
import {
  AuthorityRegistry,
  DefaultCryptoProvider,
  FederationRegistry,
  ReplayProtection,
  TrustEngine,
  TrustRegistry,
  TrustSigner,
  TrustVerifier,
} from '../../covenant_trust/index.js';
import {
  detectConflict,
  DistributionEngine,
  DistributionSyncEngine,
} from '../index.js';

function record(
  record_id: string,
  covenant_id: string,
  version: number,
  condition: string,
): {
  record_id: string;
  covenant_id: string;
  version: number;
  action: 'CREATE';
  definition: { id: string; name: string; enabled: boolean; severity: 'HIGH'; condition: string };
  timestamp: number;
} {
  return {
    record_id,
    covenant_id,
    version,
    action: 'CREATE',
    definition: { id: covenant_id, name: 'C', enabled: true, severity: 'HIGH', condition },
    timestamp: Date.now(),
  };
}

function keyPair(): { privateKey: string; publicKey: string } {
  const { privateKey: privObj, publicKey: pubObj } = generateKeyPairSync('ed25519');
  const pkcs8 = (privObj.export({ type: 'pkcs8', format: 'der' }) as Buffer).toString('base64');
  const spki = (pubObj.export({ type: 'spki', format: 'der' }) as Buffer).toString('base64');
  return { privateKey: pkcs8, publicKey: spki };
}

function trust(node_id: string, pub: string): TrustEngine {
  const registry = new TrustRegistry();
  registry.registerKey(node_id, {
    node_id,
    public_key: pub,
    key_id: 'default',
    created_at: 1,
  });
  const federation = new FederationRegistry();
  federation.registerMember({ node_id, authority_id: 'root-1' });
  const authorities = new AuthorityRegistry();
  authorities.registerAuthority({ authority_id: 'root-1', public_key: 'pk', level: 'ROOT' });
  const verifier = new TrustVerifier(new DefaultCryptoProvider());
  return new TrustEngine(verifier, registry, federation, authorities, new ReplayProtection());
}

describe('Covenant Distribution (14R)', () => {
  describe('broadcast', () => {
    it('records sent via transport', async () => {
      const store = new CovenantPersistenceStore();
      let sent: unknown = null;
      const transport = {
        send: async (envelope: unknown) => {
          sent = envelope;
        },
        onReceive: (_handler: (envelope: unknown) => Promise<void>) => {},
      };
      const keys = keyPair();
      const signer = new TrustSigner(new DefaultCryptoProvider(), keys.privateKey, keys.publicKey, 'node-A');
      const engine = new DistributionEngine(store, transport as any, 'node-A', trust('node-A', keys.publicKey));
      const signed = [signer.sign(record('r1', 'c1', 1, 'v1') as any)];
      await engine.broadcast(signed as any);
      assert.ok(sent != null);
      const env = sent as { node_id: string; records: unknown[]; timestamp: number };
      assert.strictEqual(env.node_id, 'node-A');
      assert.strictEqual(env.records.length, 1);
      assert.ok(typeof env.timestamp === 'number');
    });
  });

  describe('receive', () => {
    it('incoming records appended', async () => {
      const store = new CovenantPersistenceStore();
      let handler: ((envelope: unknown) => Promise<void>) | null = null;
      const transport = {
        send: async () => {},
        onReceive: (h: (envelope: unknown) => Promise<void>) => {
          handler = h;
        },
      };
      const aKeys = keyPair();
      const signer = new TrustSigner(new DefaultCryptoProvider(), aKeys.privateKey, aKeys.publicKey, 'node-A');
      const engine = new DistributionEngine(store, transport as any, 'node-B', trust('node-A', aKeys.publicKey));
      engine.start();
      assert.ok(handler != null);
      const fn = handler as (envelope: unknown) => Promise<void>;
      await fn({
        node_id: 'node-A',
        records: [signer.sign(record('r1', 'c1', 1, 'v1') as any)],
        timestamp: Date.now(),
      });
      assert.strictEqual(store.getAll().length, 1);
      assert.strictEqual(store.getAll()[0]!.record_id, 'r1');
    });
  });

  describe('idempotency', () => {
    it('duplicate record ignored', () => {
      const store = new CovenantPersistenceStore();
      const sync = new DistributionSyncEngine(store);
      const r = record('r1', 'c1', 1, 'v1');
      store.append(r);
      sync.apply([r]);
      assert.strictEqual(store.getAll().length, 1);
      sync.apply([record('r2', 'c2', 1, 'v2')]);
      assert.strictEqual(store.getAll().length, 2);
      sync.apply([r]);
      assert.strictEqual(store.getAll().length, 2);
    });
  });

  describe('conflict detection', () => {
    it('same version + different definition → conflict', () => {
      const local = [record('r1', 'c1', 1, 'v1')];
      const incoming = [record('r2', 'c1', 1, 'v2')];
      assert.strictEqual(detectConflict(local, incoming), true);
    });
    it('same version + same definition → no conflict', () => {
      const r = record('r1', 'c1', 1, 'v1');
      const local = [r];
      const incoming = [{ ...r, record_id: 'r2' }];
      assert.strictEqual(detectConflict(local, incoming), false);
    });
  });

  describe('multi-node sync', () => {
    it('node A send → node B receive → both converge to same snapshot', async () => {
      const storeA = new CovenantPersistenceStore();
      const storeB = new CovenantPersistenceStore();
      let bHandler: ((envelope: unknown) => Promise<void>) | null = null;
      const aKeys = keyPair();
      const signer = new TrustSigner(new DefaultCryptoProvider(), aKeys.privateKey, aKeys.publicKey, 'A');
      const transportA = {
        send: async (envelope: unknown) => {
          if (bHandler) await bHandler(envelope);
        },
        onReceive: () => {},
      };
      const transportB = {
        send: async () => {},
        onReceive: (handler: (envelope: unknown) => Promise<void>) => {
          bHandler = handler;
        },
      };
      const engineA = new DistributionEngine(storeA, transportA as any, 'A', trust('A', aKeys.publicKey));
      const engineB = new DistributionEngine(storeB, transportB as any, 'B', trust('A', aKeys.publicKey));
      engineB.start();

      const r1 = record('r1', 'c1', 1, 'state.value < 100');
      storeA.append(r1);
      await engineA.broadcast([signer.sign(r1 as any)] as any);

      const snapshotA = buildCovenantSnapshot(storeA.getAll());
      const snapshotB = buildCovenantSnapshot(storeB.getAll());
      assert.strictEqual(snapshotA.size, snapshotB.size);
      assert.strictEqual(snapshotA.get('c1')?.condition, snapshotB.get('c1')?.condition);
    });
  });

  describe('integration: persistence → distribution → sync → DSL → runtime', () => {
    it('sync then getCurrentDefinitions → CovenantLoader', () => {
      const store = new CovenantPersistenceStore();
      store.append(record('r1', 'c1', 1, 'state.value < 100'));
      const sync = new DistributionSyncEngine(store);
      sync.apply([record('r2', 'c2', 1, 'replay.valid')]);
      const snapshot = buildCovenantSnapshot(store.getAll());
      const defs = Array.from(snapshot.values());
      const covenants = CovenantLoader.loadFromJSON(defs);
      assert.strictEqual(covenants.length, 2);
    });
  });

  describe('validation', () => {
    it('empty node_id envelope → no append', async () => {
      const store = new CovenantPersistenceStore();
      let handler: ((envelope: unknown) => Promise<void>) | null = null;
      const transport = {
        send: async () => {},
        onReceive: (h: (envelope: unknown) => Promise<void>) => {
          handler = h;
        },
      };
      const keys = keyPair();
      const engine = new DistributionEngine(store, transport as any, 'N', trust('N', keys.publicKey));
      engine.start();
      await handler!({
        node_id: '',
        records: [],
        timestamp: Date.now(),
      });
      assert.strictEqual(store.getAll().length, 0);
    });
  });
});
