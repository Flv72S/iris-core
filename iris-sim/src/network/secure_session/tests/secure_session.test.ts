/**
 * Microstep 15A — Secure Session Manager. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateKeyPairSync } from 'node:crypto';
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
import { SessionError, SessionErrorCode, SessionManager, SessionRegistry } from '../index.js';

function keyPair(): { privateKey: string; publicKey: string } {
  const { privateKey: privObj, publicKey: pubObj } = generateKeyPairSync('ed25519');
  const pkcs8 = (privObj.export({ type: 'pkcs8', format: 'der' }) as Buffer).toString('base64');
  const spki = (pubObj.export({ type: 'spki', format: 'der' }) as Buffer).toString('base64');
  return { privateKey: pkcs8, publicKey: spki };
}

function makeTrust(nodeId: string, pub: string): { trust: TrustEngine; registry: TrustRegistry } {
  const crypto = new DefaultCryptoProvider();
  const verifier = new TrustVerifier(crypto);
  const registry = new TrustRegistry();
  registry.registerKey(nodeId, { node_id: nodeId, public_key: pub, key_id: 'default', created_at: 1 });
  const federation = new FederationRegistry();
  federation.registerMember({ node_id: nodeId, authority_id: 'root-1' });
  const authorities = new AuthorityRegistry();
  authorities.registerAuthority({ authority_id: 'root-1', public_key: 'pk', level: 'ROOT' });
  const trust = new TrustEngine(verifier, registry, federation, authorities, new ReplayProtection());
  return { trust, registry };
}

describe('Secure Session Manager (15A)', () => {
  it('valid handshake: trusted nodes, valid signature → session created', () => {
    const aKeys = keyPair();

    const bKeys = keyPair();

    // Trust setup: B must trust/accept A
    const { trust: trustB, registry: trustRegB } = makeTrust('node-A', aKeys.publicKey);
    // A signs responses
    const signerA = new TrustSigner(new DefaultCryptoProvider(), aKeys.privateKey, aKeys.publicKey, 'node-A', 'default');
    // B signer is unused in this flow but required by manager API
    const signerB = new TrustSigner(new DefaultCryptoProvider(), bKeys.privateKey, bKeys.publicKey, 'node-B', 'default');

    const mgrA = new SessionManager(new SessionRegistry(), trustB, signerA, trustRegB, 'node-A', { ttlMs: 1000 });
    const sessionRegistryB = new SessionRegistry();
    const mgrB = new SessionManager(sessionRegistryB, trustB, signerB, trustRegB, 'node-B', { ttlMs: 1000 });

    const init = mgrA.initiateHandshake('node-B');
    const challenge = mgrB.handleInit(init);
    const response = mgrA.handleChallenge(challenge);
    const session = mgrB.finalizeHandshake(response);

    assert.strictEqual(session.status, 'active');
    assert.strictEqual(session.node_id_local, 'node-B');
    assert.strictEqual(session.node_id_remote, 'node-A');
    assert.strictEqual(session.public_key_remote, aKeys.publicKey);
  });

  it('untrusted node: handshake rejected', () => {
    const aKeys = keyPair();
    const crypto = new DefaultCryptoProvider();
    const verifier = new TrustVerifier(crypto);
    const registry = new TrustRegistry();
    // Note: federation has no member, so NOT_IN_FEDERATION will be thrown by TrustEngine
    const federation = new FederationRegistry();
    const authorities = new AuthorityRegistry();
    authorities.registerAuthority({ authority_id: 'root-1', public_key: 'pk', level: 'ROOT' });
    const trust = new TrustEngine(verifier, registry, federation, authorities, new ReplayProtection());

    const signerA = new TrustSigner(crypto, aKeys.privateKey, aKeys.publicKey, 'node-A', 'default');
    const sessionRegistry = new SessionRegistry();
    const mgr = new SessionManager(sessionRegistry, trust, signerA, registry, 'node-B');

    const init = mgr.initiateHandshake('node-B');
    const challenge = mgr.handleInit(init);
    const response = mgr.handleChallenge(challenge);
    assert.throws(
      () => mgr.finalizeHandshake(response),
      (e: unknown) => e instanceof SessionError && e.code === SessionErrorCode.UNTRUSTED_NODE,
    );
  });

  it('invalid signature: handshake rejected', () => {
    const aKeys = keyPair();
    const { trust, registry } = makeTrust('node-A', aKeys.publicKey);
    const signerA = new TrustSigner(new DefaultCryptoProvider(), aKeys.privateKey, aKeys.publicKey, 'node-A', 'default');
    const mgr = new SessionManager(new SessionRegistry(), trust, signerA, registry, 'node-B');

    const init = mgr.initiateHandshake('node-B');
    const challenge = mgr.handleInit(init);
    const response = mgr.handleChallenge(challenge);
    const tampered = {
      ...response,
      envelope: { ...response.envelope, signed_at: response.envelope.signed_at + 1 },
    };
    assert.throws(
      () => mgr.finalizeHandshake(tampered),
      (e: unknown) => e instanceof SessionError && e.code === SessionErrorCode.SIGNATURE_INVALID,
    );
  });

  it('session id not injectable: handshake input containing session_id is rejected', () => {
    const aKeys = keyPair();
    const { trust, registry } = makeTrust('node-A', aKeys.publicKey);
    const signerA = new TrustSigner(new DefaultCryptoProvider(), aKeys.privateKey, aKeys.publicKey, 'node-A', 'default');
    const responder = new SessionManager(new SessionRegistry(), trust, signerA, registry, 'node-B', { ttlMs: 1000 });
    const initiator = new SessionManager(new SessionRegistry(), trust, signerA, registry, 'node-A', { ttlMs: 1000 });

    const init = initiator.initiateHandshake('node-B') as any;
    const badInit = { ...init, session_id: 'evil' } as any;
    assert.throws(
      () => responder.handleInit(badInit),
      (e: unknown) => e instanceof SessionError && e.code === SessionErrorCode.INVALID_HANDSHAKE,
    );
  });

  it('clock drift tolerance: init timestamp within ±30s is accepted; beyond is rejected', () => {
    const MAX_DRIFT = 30_000;
    let now = Date.now();
    const nowFn = () => now;

    const aKeys = keyPair();
    const { trust, registry } = makeTrust('node-A', aKeys.publicKey);
    const signerA = new TrustSigner(new DefaultCryptoProvider(), aKeys.privateKey, aKeys.publicKey, 'node-A', 'default');

    const responder = new SessionManager(new SessionRegistry(), trust, signerA, registry, 'node-B', {
      ttlMs: 1000,
      now: nowFn,
    });
    const initiator = new SessionManager(new SessionRegistry(), trust, signerA, registry, 'node-A', { ttlMs: 1000, now: nowFn });

    // within drift
    const initWithin = initiator.initiateHandshake('node-B') as any;
    const within = { ...initWithin, timestamp: now - (MAX_DRIFT - 1) };
    const challenge = responder.handleInit(within as any);
    assert.ok(typeof challenge.challenge === 'string');

    // beyond drift
    const initBeyond = initiator.initiateHandshake('node-B') as any;
    const beyond = { ...initBeyond, timestamp: now - (MAX_DRIFT + 1) };
    assert.throws(
      () => responder.handleInit(beyond as any),
      (e: unknown) => e instanceof SessionError && e.code === SessionErrorCode.INVALID_HANDSHAKE,
    );
  });

  it('session concurrency: creating > MAX sessions revokes oldest automatically', () => {
    const MAX = 5;
    let now = Date.now();
    const nowFn = () => now;

    const aKeys = keyPair();
    const { trust, registry } = makeTrust('node-A', aKeys.publicKey);
    const signerA = new TrustSigner(new DefaultCryptoProvider(), aKeys.privateKey, aKeys.publicKey, 'node-A', 'default');

    const sessionRegistry = new SessionRegistry();
    const responder = new SessionManager(sessionRegistry, trust, signerA, registry, 'node-B', {
      ttlMs: 1000000,
      now: nowFn,
    });
    const initiator = new SessionManager(new SessionRegistry(), trust, signerA, registry, 'node-A', {
      ttlMs: 1000000,
      now: nowFn,
    });
    const ids: string[] = [];

    for (let i = 0; i < MAX + 1; i++) {
      now += 1; // ensure created_at ordering
      const init = initiator.initiateHandshake('node-B');
      const challenge = responder.handleInit(init);
      const response = initiator.handleChallenge(challenge);
      const s = responder.finalizeHandshake(response);
      ids.push(s.session_id);
    }

    const oldest = ids[0]!;
    const oldestSession = sessionRegistry.get(oldest);
    assert.strictEqual(oldestSession?.status, 'revoked');
    assert.throws(
      () => responder.validateSession(oldest),
      (e: unknown) => e instanceof SessionError && e.code === SessionErrorCode.SESSION_REVOKED,
    );
  });

  it('idle timeout: inactivity beyond timeout expires session', () => {
    let now = Date.now();
    const nowFn = () => now;

    const aKeys = keyPair();
    const { trust, registry } = makeTrust('node-A', aKeys.publicKey);
    const signerA = new TrustSigner(new DefaultCryptoProvider(), aKeys.privateKey, aKeys.publicKey, 'node-A', 'default');

    const sessionRegistry = new SessionRegistry();
    const responder = new SessionManager(sessionRegistry, trust, signerA, registry, 'node-B', {
      ttlMs: 1000000,
      idleTimeoutMs: 50,
      now: nowFn,
    });
    const initiator = new SessionManager(new SessionRegistry(), trust, signerA, registry, 'node-A', {
      ttlMs: 1000000,
      idleTimeoutMs: 50,
      now: nowFn,
    });

    const init = initiator.initiateHandshake('node-B');
    const challenge = responder.handleInit(init);
    const response = initiator.handleChallenge(challenge);
    const session = responder.finalizeHandshake(response);

    // still valid
    responder.validateSession(session.session_id);

    // inactive past idle timeout
    now += 60;
    assert.throws(
      () => responder.validateSession(session.session_id),
      (e: unknown) => e instanceof SessionError && e.code === SessionErrorCode.SESSION_EXPIRED,
    );
  });

  it('activity refresh: validateSession updates last_activity_at', () => {
    let now = Date.now();
    const nowFn = () => now;

    const aKeys = keyPair();
    const { trust, registry } = makeTrust('node-A', aKeys.publicKey);
    const signerA = new TrustSigner(new DefaultCryptoProvider(), aKeys.privateKey, aKeys.publicKey, 'node-A', 'default');

    const sessionRegistry = new SessionRegistry();
    const responder = new SessionManager(sessionRegistry, trust, signerA, registry, 'node-B', {
      ttlMs: 1000000,
      idleTimeoutMs: 100,
      now: nowFn,
    });

    const initiator = new SessionManager(new SessionRegistry(), trust, signerA, registry, 'node-A', {
      ttlMs: 1000000,
      idleTimeoutMs: 100,
      now: nowFn,
    });

    const init = initiator.initiateHandshake('node-B');
    const challenge = responder.handleInit(init);
    const response = initiator.handleChallenge(challenge);
    const session = responder.finalizeHandshake(response);

    const before = sessionRegistry.get(session.session_id)!.last_activity_at;

    // After some time, validate refreshes activity and keeps session valid
    now += 50;
    responder.validateSession(session.session_id);
    const afterRefresh = sessionRegistry.get(session.session_id)!.last_activity_at;
    assert.ok(afterRefresh >= before + 50);

    now += 60; // total since refresh = 60 < idleTimeoutMs(100)
    responder.validateSession(session.session_id);
  });

  it('expired session: access rejected', async () => {
    const aKeys = keyPair();
    const { trust, registry } = makeTrust('node-A', aKeys.publicKey);
    const signerA = new TrustSigner(new DefaultCryptoProvider(), aKeys.privateKey, aKeys.publicKey, 'node-A', 'default');
    const sessionRegistry = new SessionRegistry();
    const mgr = new SessionManager(sessionRegistry, trust, signerA, registry, 'node-B', { ttlMs: 5 });

    const init = mgr.initiateHandshake('node-B');
    const challenge = mgr.handleInit(init);
    const response = mgr.handleChallenge(challenge);
    const session = mgr.finalizeHandshake(response);

    await new Promise((r) => setTimeout(r, 10));
    assert.throws(
      () => mgr.validateSession(session.session_id),
      (e: unknown) => e instanceof SessionError && e.code === SessionErrorCode.SESSION_EXPIRED,
    );
  });

  it('revoked session: access rejected', () => {
    const aKeys = keyPair();
    const { trust, registry } = makeTrust('node-A', aKeys.publicKey);
    const signerA = new TrustSigner(new DefaultCryptoProvider(), aKeys.privateKey, aKeys.publicKey, 'node-A', 'default');
    const sessionRegistry = new SessionRegistry();
    const mgr = new SessionManager(sessionRegistry, trust, signerA, registry, 'node-B', { ttlMs: 1000 });

    const init = mgr.initiateHandshake('node-B');
    const challenge = mgr.handleInit(init);
    const response = mgr.handleChallenge(challenge);
    const session = mgr.finalizeHandshake(response);

    sessionRegistry.revoke(session.session_id);
    assert.throws(
      () => mgr.validateSession(session.session_id),
      (e: unknown) => e instanceof SessionError && e.code === SessionErrorCode.SESSION_REVOKED,
    );
  });

  it('replay attempt: same handshake reused → reject', () => {
    const aKeys = keyPair();
    const { trust, registry } = makeTrust('node-A', aKeys.publicKey);
    const signerA = new TrustSigner(new DefaultCryptoProvider(), aKeys.privateKey, aKeys.publicKey, 'node-A', 'default');
    const mgr = new SessionManager(new SessionRegistry(), trust, signerA, registry, 'node-B');

    const init = mgr.initiateHandshake('node-B');
    const challenge = mgr.handleInit(init);
    const response = mgr.handleChallenge(challenge);
    mgr.finalizeHandshake(response);
    assert.throws(
      () => mgr.finalizeHandshake(response),
      (e: unknown) => e instanceof SessionError && e.code === SessionErrorCode.INVALID_HANDSHAKE,
    );
  });
});

