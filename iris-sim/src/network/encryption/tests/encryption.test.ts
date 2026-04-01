/**
 * Microstep 15C-H — Encryption Hardening tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateKeyPairSync, randomUUID } from 'node:crypto';

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

import { SessionManager, SessionRegistry } from '../../secure_session/index.js';
import { MessageEnvelopeSigner, MessageEnvelopeValidator } from '../../message_envelope/index.js';
import { EncryptionEngine, EncryptionError, EncryptionErrorCode, KeyExchange } from '../index.js';
import { AuthenticatedKeyExchangeHandshake } from '../encryption_handshake.js';

function keyPair(): { privateKey: string; publicKey: string } {
  const { privateKey: privObj, publicKey: pubObj } = generateKeyPairSync('ed25519');
  const pkcs8 = (privObj.export({ type: 'pkcs8', format: 'der' }) as Buffer).toString('base64');
  const spki = (pubObj.export({ type: 'spki', format: 'der' }) as Buffer).toString('base64');
  return { privateKey: pkcs8, publicKey: spki };
}

function makeTrustForSender(
  senderId: string,
  senderPub: string,
  keyId: string,
): { trust: TrustEngine; registry: TrustRegistry; crypto: DefaultCryptoProvider } {
  const crypto = new DefaultCryptoProvider();
  const verifier = new TrustVerifier(crypto);
  const registry = new TrustRegistry();
  registry.registerKey(senderId, { node_id: senderId, public_key: senderPub, key_id: keyId, created_at: 1 });

  const federation = new FederationRegistry();
  federation.registerMember({ node_id: senderId, authority_id: 'root-1' });

  const authorities = new AuthorityRegistry();
  authorities.registerAuthority({ authority_id: 'root-1', public_key: 'pk', level: 'ROOT' });

  const trust = new TrustEngine(verifier, registry, federation, authorities, new ReplayProtection());
  return { trust, registry, crypto };
}

function createSecureSessionForB(nodeA: { id: string; keys: ReturnType<typeof keyPair>; keyId: string }, nodeBId: string) {
  const ttlMs = 60_000;
  const nowFn = () => Date.now();

  const { trust: trustB, registry: trustRegB, crypto } = makeTrustForSender(nodeA.id, nodeA.keys.publicKey, nodeA.keyId);
  const signerA = new TrustSigner(crypto, nodeA.keys.privateKey, nodeA.keys.publicKey, nodeA.id, nodeA.keyId);

  // signerB is required by SessionManager API but isn't used by B responder finalize() in this test flow.
  const dummyKeys = keyPair();
  const signerB = new TrustSigner(crypto, dummyKeys.privateKey, dummyKeys.publicKey, nodeBId, 'legacy');

  const sessionRegistryB = new SessionRegistry();
  const mgrB = new SessionManager(sessionRegistryB, trustB, signerB, trustRegB, nodeBId, { ttlMs, now: nowFn });

  const sessionRegistryA = new SessionRegistry();
  const mgrA = new SessionManager(sessionRegistryA, trustB, signerA, trustRegB, nodeA.id, { ttlMs, now: nowFn });

  const init = mgrA.initiateHandshake(nodeBId);
  const challenge = mgrB.handleInit(init);
  const response = mgrA.handleChallenge(challenge);
  const session = mgrB.finalizeHandshake(response);

  return { mgrA, mgrB, session, trustB, trustRegB, signerA, crypto };
}

function createSignedRemoteHandshake(args: {
  signer: TrustSigner;
  trustForVerification: TrustEngine;
  sessionId: string;
  senderId: string;
  recipientId: string;
  ephemeralPublicKey: string;
  timestamp: number;
}) {
  const h = new AuthenticatedKeyExchangeHandshake(args.signer, args.trustForVerification);
  return h.createSignedHandshake({
    session_id: args.sessionId,
    sender_node_id: args.senderId,
    recipient_node_id: args.recipientId,
    ephemeral_public_key: args.ephemeralPublicKey,
    timestamp: args.timestamp,
  });
}

function createMessageEnvelope(args: {
  msgSigner: MessageEnvelopeSigner;
  sessionId: string;
  senderId: string;
  recipientId: string;
  timestamp: number;
  nonce: string;
  payload: unknown;
}) {
  return args.msgSigner.sign({
    message_id: randomUUID(),
    session_id: args.sessionId,
    sender_node_id: args.senderId,
    recipient_node_id: args.recipientId,
    timestamp: args.timestamp,
    nonce: args.nonce,
    payload: args.payload,
  });
}

describe('Encryption Layer (15C-H)', () => {
  it('valid handshake + encrypt/decrypt success', () => {
    const nodeA = { id: 'node-A', keys: keyPair(), keyId: 'default' };
    const nodeBId = 'node-B';

    const { session, mgrB, trustB, signerA } = createSecureSessionForB(nodeA, nodeBId);
    const engineB = new EncryptionEngine(mgrB, trustB);

    // Signed remote handshake from A -> B (trusted by trustB).
    const ke = new KeyExchange();
    const remoteEph = ke.generateEphemeralKeyPair();
    const ts = Date.now();
    const remoteHandshake = createSignedRemoteHandshake({
      signer: signerA,
      trustForVerification: trustB,
      sessionId: session.session_id,
      senderId: nodeA.id,
      recipientId: nodeBId,
      ephemeralPublicKey: remoteEph.publicKey,
      timestamp: ts,
    });

    const ctx = engineB.initializeEncryptionSession(session.session_id, remoteHandshake);
    assert.ok(ctx.encryption_key.length > 0);

    const msgSigner = new MessageEnvelopeSigner(signerA);
    const envelope = createMessageEnvelope({
      msgSigner,
      sessionId: session.session_id,
      senderId: nodeA.id,
      recipientId: nodeBId,
      timestamp: ts,
      nonce: 'nonce-1',
      payload: { hello: 'world', n: 1 },
    });

    const encrypted = engineB.encryptEnvelope(envelope);
    const decrypted = engineB.decryptEnvelope(encrypted);

    const validator = new MessageEnvelopeValidator(mgrB, trustB);
    validator.validate(decrypted);
    assert.deepStrictEqual(decrypted.payload, envelope.payload);
  });

  it('invalid handshake signature → INVALID_HANDSHAKE_SIGNATURE', () => {
    const nodeA = { id: 'node-A', keys: keyPair(), keyId: 'default' };
    const nodeBId = 'node-B';
    const { session, mgrB, trustB, signerA } = createSecureSessionForB(nodeA, nodeBId);

    const engineB = new EncryptionEngine(mgrB, trustB);
    const ke = new KeyExchange();
    const remoteEph = ke.generateEphemeralKeyPair();

    const ts = Date.now();
    const remoteHandshake = createSignedRemoteHandshake({
      signer: signerA,
      trustForVerification: trustB,
      sessionId: session.session_id,
      senderId: nodeA.id,
      recipientId: nodeBId,
      ephemeralPublicKey: remoteEph.publicKey,
      timestamp: ts,
    });

    const sigBuf = Buffer.from(remoteHandshake.signature, 'base64');
    assert.ok(sigBuf.byteLength > 0);
    sigBuf.fill(0);
    const tampered = { ...remoteHandshake, signature: sigBuf.toString('base64') };
    assert.notStrictEqual(tampered.signature, remoteHandshake.signature);

    assert.throws(
      () => trustB.validate(tampered as any),
      (e: unknown) => (e as { code?: unknown }).code === 'INVALID_SIGNATURE',
    );
    let caught: unknown = null;
    try {
      engineB.initializeEncryptionSession(session.session_id, tampered);
      assert.fail('Expected initializeEncryptionSession to throw');
    } catch (e) {
      caught = e;
    }
    assert.ok(caught instanceof EncryptionError);
    assert.strictEqual((caught as EncryptionError).code, EncryptionErrorCode.INVALID_HANDSHAKE_SIGNATURE);
  });

  it('MITM forged key rejected (untrusted sender) → HANDSHAKE_VERIFICATION_FAILED', () => {
    const nodeA = { id: 'node-A', keys: keyPair(), keyId: 'default' };
    const nodeBId = 'node-B';
    const { session, mgrB, trustB } = createSecureSessionForB(nodeA, nodeBId);

    const engineB = new EncryptionEngine(mgrB, trustB);
    const ke = new KeyExchange();
    const remoteEph = ke.generateEphemeralKeyPair();
    const ts = Date.now();

    const nodeC = { id: 'node-C', keys: keyPair(), keyId: 'default' };
    const { crypto } = makeTrustForSender(nodeC.id, nodeC.keys.publicKey, nodeC.keyId);
    const signerC = new TrustSigner(crypto, nodeC.keys.privateKey, nodeC.keys.publicKey, nodeC.id, nodeC.keyId);

    // Forge a handshake pretending the sender is A, but sign it with C.
    const forged = createSignedRemoteHandshake({
      signer: signerC,
      trustForVerification: trustB,
      sessionId: session.session_id,
      senderId: nodeA.id, // claimed sender=A
      recipientId: nodeBId,
      ephemeralPublicKey: remoteEph.publicKey,
      timestamp: ts,
    });

    assert.throws(
      () => engineB.initializeEncryptionSession(session.session_id, forged),
      (e: unknown) => e instanceof EncryptionError && e.code === EncryptionErrorCode.HANDSHAKE_VERIFICATION_FAILED,
    );
  });

  it('wrong session binding → decryption fails (INVALID_SESSION_BINDING)', () => {
    const nodeA = { id: 'node-A', keys: keyPair(), keyId: 'default' };
    const nodeBId = 'node-B';
    const { session, mgrB, trustB, signerA } = createSecureSessionForB(nodeA, nodeBId);

    const engine1 = new EncryptionEngine(mgrB, trustB);
    const ke = new KeyExchange();
    const remoteEph = ke.generateEphemeralKeyPair();
    const ts = Date.now();

    const remoteHandshake = createSignedRemoteHandshake({
      signer: signerA,
      trustForVerification: trustB,
      sessionId: session.session_id,
      senderId: nodeA.id,
      recipientId: nodeBId,
      ephemeralPublicKey: remoteEph.publicKey,
      timestamp: ts,
    });

    engine1.initializeEncryptionSession(session.session_id, remoteHandshake);

    const msgSigner = new MessageEnvelopeSigner(signerA);
    const envelope = createMessageEnvelope({
      msgSigner,
      sessionId: session.session_id,
      senderId: nodeA.id,
      recipientId: nodeBId,
      timestamp: ts,
      nonce: 'nonce-1',
      payload: { a: 1 },
    });

    const encrypted = engine1.encryptEnvelope(envelope);

    // Another engine instance without initialization must reject decryption.
    const engine2 = new EncryptionEngine(mgrB, trustB);
    assert.throws(
      () => engine2.decryptEnvelope(encrypted),
      (e: unknown) => e instanceof EncryptionError && e.code === EncryptionErrorCode.INVALID_SESSION_BINDING,
    );

    // Incorrect session binding during initialization must be rejected.
    const wrongRemoteHandshake = createSignedRemoteHandshake({
      signer: signerA,
      trustForVerification: trustB,
      sessionId: randomUUID(), // mismatch
      senderId: nodeA.id,
      recipientId: nodeBId,
      ephemeralPublicKey: remoteEph.publicKey,
      timestamp: ts,
    });

    assert.throws(
      () => engine2.initializeEncryptionSession(session.session_id, wrongRemoteHandshake),
      (e: unknown) => e instanceof EncryptionError && e.code === EncryptionErrorCode.INVALID_SESSION_BINDING,
    );
  });

  it('key uniqueness: different sessions → different encryption keys', () => {
    const nodeA = { id: 'node-A', keys: keyPair(), keyId: 'default' };
    const nodeBId = 'node-B';
    const { mgrA, mgrB, session: session1, trustB, signerA } = createSecureSessionForB(nodeA, nodeBId);

    const engineB = new EncryptionEngine(mgrB, trustB);
    const ke = new KeyExchange();

    const remoteEph1 = ke.generateEphemeralKeyPair();
    const ts1 = Date.now();
    const h1 = createSignedRemoteHandshake({
      signer: signerA,
      trustForVerification: trustB,
      sessionId: session1.session_id,
      senderId: nodeA.id,
      recipientId: nodeBId,
      ephemeralPublicKey: remoteEph1.publicKey,
      timestamp: ts1,
    });
    const ctx1 = engineB.initializeEncryptionSession(session1.session_id, h1);

    // Create a second secure session.
    const init2 = mgrA.initiateHandshake(nodeBId);
    const challenge2 = mgrB.handleInit(init2);
    const response2 = mgrA.handleChallenge(challenge2);
    const session2 = mgrB.finalizeHandshake(response2);

    const remoteEph2 = ke.generateEphemeralKeyPair();
    const ts2 = Date.now();
    const h2 = createSignedRemoteHandshake({
      signer: signerA,
      trustForVerification: trustB,
      sessionId: session2.session_id,
      senderId: nodeA.id,
      recipientId: nodeBId,
      ephemeralPublicKey: remoteEph2.publicKey,
      timestamp: ts2,
    });
    const ctx2 = engineB.initializeEncryptionSession(session2.session_id, h2);

    assert.notStrictEqual(ctx1.encryption_key, ctx2.encryption_key);
  });

  it('HKDF correctness: encryption_key differs from raw shared_secret', () => {
    const nodeA = { id: 'node-A', keys: keyPair(), keyId: 'default' };
    const nodeBId = 'node-B';
    const { session, mgrB, trustB, signerA } = createSecureSessionForB(nodeA, nodeBId);

    const engineB = new EncryptionEngine(mgrB, trustB);
    const ke = new KeyExchange();
    const remoteEph = ke.generateEphemeralKeyPair();
    const ts = Date.now();
    const remoteHandshake = createSignedRemoteHandshake({
      signer: signerA,
      trustForVerification: trustB,
      sessionId: session.session_id,
      senderId: nodeA.id,
      recipientId: nodeBId,
      ephemeralPublicKey: remoteEph.publicKey,
      timestamp: ts,
    });

    const ctx = engineB.initializeEncryptionSession(session.session_id, remoteHandshake);
    assert.notStrictEqual(ctx.encryption_key, ctx.shared_secret);

    const keyBuf = Buffer.from(ctx.encryption_key, 'base64');
    assert.strictEqual(keyBuf.byteLength, 32);
  });
});

