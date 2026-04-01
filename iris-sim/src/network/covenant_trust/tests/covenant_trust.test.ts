/**
 * Microstep 14S — Trust & Verification Layer. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateKeyPairSync } from 'node:crypto';
import type { CovenantPersistenceRecord } from '../../covenant_persistence/index.js';
import {
  DefaultCryptoProvider,
  AuthorityRegistry,
  FederationRegistry,
  ReplayProtection,
  TrustEngine,
  TrustError,
  TrustErrorCode,
  TrustRegistry,
  TrustSigner,
  TrustVerifier,
} from '../index.js';

function keyPair(): { privateKey: string; publicKey: string } {
  const { privateKey: privObj, publicKey: pubObj } = generateKeyPairSync('ed25519');
  const pkcs8 = (privObj.export({ type: 'pkcs8', format: 'der' }) as Buffer).toString('base64');
  const spki = (pubObj.export({ type: 'spki', format: 'der' }) as Buffer).toString('base64');
  return { privateKey: pkcs8, publicKey: spki };
}

function record(record_id: string): CovenantPersistenceRecord {
  return {
    record_id,
    covenant_id: 'c1',
    version: 1,
    action: 'CREATE',
    definition: {
      id: 'c1',
      name: 'C1',
      enabled: true,
      severity: 'HIGH',
      condition: 'state.value < 1000',
    },
    timestamp: 123,
    metadata: { actor_id: 'admin' },
  };
}

function makeEngine(node_id: string, publicKey: string): TrustEngine {
  const crypto = new DefaultCryptoProvider();
  const verifier = new TrustVerifier(crypto);
  const registry = new TrustRegistry();
  registry.registerKey(node_id, {
    node_id,
    public_key: publicKey,
    key_id: 'default',
    created_at: 1,
  });
  const federation = new FederationRegistry();
  federation.registerMember({ node_id, authority_id: 'root-1' });
  const authorities = new AuthorityRegistry();
  authorities.registerAuthority({ authority_id: 'root-1', public_key: 'pk', level: 'ROOT' });
  return new TrustEngine(verifier, registry, federation, authorities, new ReplayProtection());
}

describe('Covenant Trust (14T)', () => {
  it('signing: record → signed envelope created', () => {
    const keys = keyPair();
    const signer = new TrustSigner(new DefaultCryptoProvider(), keys.privateKey, keys.publicKey, 'node-A');
    const env = signer.sign(record('r1'));
    assert.strictEqual(env.node_id, 'node-A');
    assert.ok(env.signature.length > 0);
    assert.strictEqual(env.public_key, keys.publicKey);
    assert.ok(typeof env.key_id === 'string');
    assert.ok(typeof env.record_hash === 'string');
  });

  it('verification success: valid signature → accepted', () => {
    const keys = keyPair();
    const crypto = new DefaultCryptoProvider();
    const signer = new TrustSigner(crypto, keys.privateKey, keys.publicKey, 'node-A');
    const engine = makeEngine('node-A', keys.publicKey);
    const env = signer.sign(record('r1'));
    engine.validate(env);
  });

  it('verification failure: modified record after signing → rejected', () => {
    const keys = keyPair();
    const crypto = new DefaultCryptoProvider();
    const signer = new TrustSigner(crypto, keys.privateKey, keys.publicKey, 'node-A');
    const engine = makeEngine('node-A', keys.publicKey);
    const env = signer.sign(record('r1'));
    const tampered = { ...env, record: { ...env.record, version: 2 } };
    assert.throws(
      () => engine.validate(tampered),
      (e: unknown) => e instanceof TrustError && e.code === TrustErrorCode.INVALID_SIGNATURE,
    );
  });

  it('federation: unregistered node → rejected', () => {
    const keys = keyPair();
    const crypto = new DefaultCryptoProvider();
    const signer = new TrustSigner(crypto, keys.privateKey, keys.publicKey, 'node-A');
    const verifier = new TrustVerifier(crypto);
    const registry = new TrustRegistry();
    const federation = new FederationRegistry();
    const authorities = new AuthorityRegistry();
    authorities.registerAuthority({ authority_id: 'root-1', public_key: 'pk', level: 'ROOT' });
    const engine = new TrustEngine(verifier, registry, federation, authorities, new ReplayProtection());
    const env = signer.sign(record('r1'));
    assert.throws(
      () => engine.validate(env),
      (e: unknown) => e instanceof TrustError && e.code === TrustErrorCode.NOT_IN_FEDERATION,
    );
  });

  it('authority chain: invalid authority → reject', () => {
    const keys = keyPair();
    const crypto = new DefaultCryptoProvider();
    const signer = new TrustSigner(crypto, keys.privateKey, keys.publicKey, 'node-A');
    const verifier = new TrustVerifier(crypto);
    const registry = new TrustRegistry();
    registry.registerKey('node-A', { node_id: 'node-A', public_key: keys.publicKey, key_id: 'default', created_at: 1 });
    const federation = new FederationRegistry();
    federation.registerMember({ node_id: 'node-A', authority_id: 'missing-auth' });
    const authorities = new AuthorityRegistry();
    const engine = new TrustEngine(verifier, registry, federation, authorities, new ReplayProtection());
    assert.throws(
      () => engine.validate(signer.sign(record('r1'))),
      (e: unknown) => e instanceof TrustError && e.code === TrustErrorCode.UNTRUSTED_AUTHORITY,
    );
  });

  it('replay protection: same envelope twice → reject second', () => {
    const keys = keyPair();
    const crypto = new DefaultCryptoProvider();
    const signer = new TrustSigner(crypto, keys.privateKey, keys.publicKey, 'node-A');
    const engine = makeEngine('node-A', keys.publicKey);
    const env = signer.sign(record('r1'));
    engine.validate(env);
    assert.throws(
      () => engine.validate(env),
      (e: unknown) => e instanceof TrustError && e.code === TrustErrorCode.REPLAY_DETECTED,
    );
  });

  it('key rotation: new key active, old key still valid (not revoked)', () => {
    const crypto = new DefaultCryptoProvider();
    const verifier = new TrustVerifier(crypto);
    const registry = new TrustRegistry();
    const federation = new FederationRegistry();
    federation.registerMember({ node_id: 'node-A', authority_id: 'root-1' });
    const authorities = new AuthorityRegistry();
    authorities.registerAuthority({ authority_id: 'root-1', public_key: 'pk', level: 'ROOT' });
    const replay = new ReplayProtection();
    const engine = new TrustEngine(verifier, registry, federation, authorities, replay);

    const k1 = keyPair();
    const k2 = keyPair();
    registry.registerKey('node-A', { node_id: 'node-A', public_key: k1.publicKey, key_id: 'k1', created_at: 1 });
    const signer1 = new TrustSigner(crypto, k1.privateKey, k1.publicKey, 'node-A', 'k1');
    const env1 = signer1.sign(record('r1'));
    engine.validate(env1);

    registry.registerKey('node-A', { node_id: 'node-A', public_key: k2.publicKey, key_id: 'k2', created_at: 2 });
    const signer2 = new TrustSigner(crypto, k2.privateKey, k2.publicKey, 'node-A', 'k2');
    const env2 = signer2.sign(record('r2'));
    engine.validate(env2);

    // Old key still validates for its envelope (not revoked).
    engine.validate(signer1.sign(record('r3')));
  });

  it('key revocation: revoked key rejects new records after revocation', () => {
    const crypto = new DefaultCryptoProvider();
    const verifier = new TrustVerifier(crypto);
    const registry = new TrustRegistry();
    const federation = new FederationRegistry();
    federation.registerMember({ node_id: 'node-A', authority_id: 'root-1' });
    const authorities = new AuthorityRegistry();
    authorities.registerAuthority({ authority_id: 'root-1', public_key: 'pk', level: 'ROOT' });
    const engine = new TrustEngine(verifier, registry, federation, authorities, new ReplayProtection());

    const k1 = keyPair();
    registry.registerKey('node-A', { node_id: 'node-A', public_key: k1.publicKey, key_id: 'k1', created_at: 1 });
    const signer = new TrustSigner(crypto, k1.privateKey, k1.publicKey, 'node-A', 'k1');
    const oldEnv = signer.sign(record('r1'));
    engine.validate(oldEnv); // before revocation ok

    registry.revokeKey('node-A', 'k1');
    const newEnv = signer.sign(record('r2'));
    assert.throws(
      () => engine.validate(newEnv),
      (e: unknown) => e instanceof TrustError && e.code === TrustErrorCode.KEY_REVOKED,
    );
  });

  it('extended signature: tamper signed_at → reject', () => {
    const keys = keyPair();
    const crypto = new DefaultCryptoProvider();
    const signer = new TrustSigner(crypto, keys.privateKey, keys.publicKey, 'node-A');
    const engine = makeEngine('node-A', keys.publicKey);
    const env = signer.sign(record('r1'));
    const tampered = { ...env, signed_at: env.signed_at + 1 };
    assert.throws(
      () => engine.validate(tampered),
      (e: unknown) => e instanceof TrustError && e.code === TrustErrorCode.INVALID_SIGNATURE,
    );
  });
});

