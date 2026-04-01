/**
 * Microstep 15B — Message Envelope Standard. Tests.
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
import { MessageEnvelopeSigner, MessageEnvelopeValidator } from '../index.js';
import { MessageEnvelopeError, MessageEnvelopeErrorCode } from '../message_envelope_errors.js';

function keyPair(): { privateKey: string; publicKey: string } {
  const { privateKey: privObj, publicKey: pubObj } = generateKeyPairSync('ed25519');
  const pkcs8 = (privObj.export({ type: 'pkcs8', format: 'der' }) as Buffer).toString('base64');
  const spki = (pubObj.export({ type: 'spki', format: 'der' }) as Buffer).toString('base64');
  return { privateKey: pkcs8, publicKey: spki };
}

function makeTrustForNode(nodeId: string, pub: string, keyId: string): { trust: TrustEngine; registry: TrustRegistry } {
  const crypto = new DefaultCryptoProvider();
  const verifier = new TrustVerifier(crypto);
  const registry = new TrustRegistry();
  registry.registerKey(nodeId, { node_id: nodeId, public_key: pub, key_id: keyId, created_at: 1 });

  const federation = new FederationRegistry();
  federation.registerMember({ node_id: nodeId, authority_id: 'root-1' });

  const authorities = new AuthorityRegistry();
  authorities.registerAuthority({ authority_id: 'root-1', public_key: 'pk', level: 'ROOT' });

  const trust = new TrustEngine(verifier, registry, federation, authorities, new ReplayProtection());
  return { trust, registry };
}

function makeSession(nodeA: { id: string; keys: ReturnType<typeof keyPair>; keyId: string }, nodeBId: string, ttlMs: number, nowFn?: () => number) {
  const { trust: trustB, registry: trustRegB } = makeTrustForNode(nodeA.id, nodeA.keys.publicKey, nodeA.keyId);
  const crypto = new DefaultCryptoProvider();
  const signerA = new TrustSigner(crypto, nodeA.keys.privateKey, nodeA.keys.publicKey, nodeA.id, nodeA.keyId);

  // B signer is unused during finalize() but required by the constructor.
  const bKeys = keyPair();
  const signerB = new TrustSigner(crypto, bKeys.privateKey, bKeys.publicKey, nodeBId, 'legacy');

  const sessionRegistryB = new SessionRegistry();
  const cfg = nowFn != null ? { ttlMs, now: nowFn } : { ttlMs };
  const mgrB = new SessionManager(sessionRegistryB, trustB, signerB, trustRegB, nodeBId, cfg);
  const mgrA = new SessionManager(new SessionRegistry(), trustB, signerA, trustRegB, nodeA.id, cfg);

  const init = mgrA.initiateHandshake(nodeBId);
  const challenge = mgrB.handleInit(init);
  const response = mgrA.handleChallenge(challenge);
  const session = mgrB.finalizeHandshake(response);
  return { sessionManagerB: mgrB, trustB, session };
}

describe('Message Envelope Standard (15B)', () => {
  it('valid envelope: correct structure + signature + valid session', () => {
    const now = Date.now();
    const nowFn = () => now;
    const nodeA = { id: 'node-A', keys: keyPair(), keyId: 'default' };
    const nodeBId = 'node-B';

    const { sessionManagerB, trustB, session } = makeSession(nodeA, nodeBId, 60_000, nowFn);
    const crypto = new DefaultCryptoProvider();
    const signerA = new TrustSigner(crypto, nodeA.keys.privateKey, nodeA.keys.publicKey, nodeA.id, nodeA.keyId);

    const envelopeWithoutSig = {
      message_id: randomUUID(),
      session_id: session.session_id,
      sender_node_id: nodeA.id,
      recipient_node_id: nodeBId,
      timestamp: nowFn(),
      nonce: 'nonce-1',
      payload: { hello: 'world', n: 1 },
    };

    const msgSigner = new MessageEnvelopeSigner(signerA);
    const envelope = msgSigner.sign(envelopeWithoutSig);

    const validator = new MessageEnvelopeValidator(sessionManagerB, trustB);
    validator.validate(envelope);
  });

  it('tampered payload after signing → PAYLOAD_TAMPERED', () => {
    const now = Date.now();
    const nowFn = () => now;
    const nodeA = { id: 'node-A', keys: keyPair(), keyId: 'default' };
    const nodeBId = 'node-B';

    const { sessionManagerB, trustB, session } = makeSession(nodeA, nodeBId, 60_000, nowFn);
    const crypto = new DefaultCryptoProvider();
    const signerA = new TrustSigner(crypto, nodeA.keys.privateKey, nodeA.keys.publicKey, nodeA.id, nodeA.keyId);

    const msgSigner = new MessageEnvelopeSigner(signerA);
    const envelope = msgSigner.sign({
      message_id: randomUUID(),
      session_id: session.session_id,
      sender_node_id: nodeA.id,
      recipient_node_id: nodeBId,
      timestamp: nowFn(),
      nonce: 'nonce-2',
      payload: { hello: 'world' },
    });

    const tampered = {
      ...envelope,
      payload: { hello: 'tampered' },
    };

    const validator = new MessageEnvelopeValidator(sessionManagerB, trustB);
    assert.throws(
      () => validator.validate(tampered as any),
      (e: unknown) => e instanceof MessageEnvelopeError && e.code === MessageEnvelopeErrorCode.PAYLOAD_TAMPERED,
    );
  });

  it('invalid signature → INVALID_SIGNATURE', () => {
    const now = Date.now();
    const nowFn = () => now;
    const nodeA = { id: 'node-A', keys: keyPair(), keyId: 'default' };
    const nodeBId = 'node-B';

    const { sessionManagerB, trustB, session } = makeSession(nodeA, nodeBId, 60_000, nowFn);
    const crypto = new DefaultCryptoProvider();
    const signerA = new TrustSigner(crypto, nodeA.keys.privateKey, nodeA.keys.publicKey, nodeA.id, nodeA.keyId);

    const msgSigner = new MessageEnvelopeSigner(signerA);
    const envelope = msgSigner.sign({
      message_id: randomUUID(),
      session_id: session.session_id,
      sender_node_id: nodeA.id,
      recipient_node_id: nodeBId,
      timestamp: nowFn(),
      nonce: 'nonce-3',
      payload: { a: 1 },
    });

    const badSig = { ...envelope, signature: 'invalid-signature' };
    const validator = new MessageEnvelopeValidator(sessionManagerB, trustB);
    assert.throws(
      () => validator.validate(badSig as any),
      (e: unknown) => e instanceof MessageEnvelopeError && e.code === MessageEnvelopeErrorCode.INVALID_SIGNATURE,
    );
  });

  it('session mismatch (sender/recipient mismatch) → SESSION_MISMATCH', () => {
    const now = Date.now();
    const nowFn = () => now;
    const nodeA = { id: 'node-A', keys: keyPair(), keyId: 'default' };
    const nodeBId = 'node-B';

    const { sessionManagerB, trustB, session } = makeSession(nodeA, nodeBId, 60_000, nowFn);
    const crypto = new DefaultCryptoProvider();
    const signerA = new TrustSigner(crypto, nodeA.keys.privateKey, nodeA.keys.publicKey, nodeA.id, nodeA.keyId);

    const msgSigner = new MessageEnvelopeSigner(signerA);
    const envelope = msgSigner.sign({
      message_id: randomUUID(),
      session_id: session.session_id,
      sender_node_id: nodeBId, // swapped
      recipient_node_id: nodeA.id,
      timestamp: nowFn(),
      nonce: 'nonce-4',
      payload: { x: 1 },
    });

    const validator = new MessageEnvelopeValidator(sessionManagerB, trustB);
    assert.throws(
      () => validator.validate(envelope as any),
      (e: unknown) => e instanceof MessageEnvelopeError && e.code === MessageEnvelopeErrorCode.SESSION_MISMATCH,
    );
  });

  it('expired session → INVALID_SESSION', () => {
    let now = Date.now();
    const nowFn = () => now;
    const nodeA = { id: 'node-A', keys: keyPair(), keyId: 'default' };
    const nodeBId = 'node-B';

    const { sessionManagerB, trustB, session } = makeSession(nodeA, nodeBId, 10, nowFn);

    // advance time beyond expiry
    now = now + 50;

    const crypto = new DefaultCryptoProvider();
    const signerA = new TrustSigner(crypto, nodeA.keys.privateKey, nodeA.keys.publicKey, nodeA.id, nodeA.keyId);
    const msgSigner = new MessageEnvelopeSigner(signerA);
    const envelope = msgSigner.sign({
      message_id: randomUUID(),
      session_id: session.session_id,
      sender_node_id: nodeA.id,
      recipient_node_id: nodeBId,
      timestamp: nowFn(),
      nonce: 'nonce-5',
      payload: { z: 9 },
    });

    const validator = new MessageEnvelopeValidator(sessionManagerB, trustB);
    assert.throws(
      () => validator.validate(envelope as any),
      (e: unknown) => e instanceof MessageEnvelopeError && e.code === MessageEnvelopeErrorCode.INVALID_SESSION,
    );
  });

  it('nonce uniqueness: duplicate nonce → REPLAY_DETECTED', () => {
    const now = Date.now();
    const nowFn = () => now;
    const nodeA = { id: 'node-A', keys: keyPair(), keyId: 'default' };
    const nodeBId = 'node-B';

    const { sessionManagerB, trustB, session } = makeSession(nodeA, nodeBId, 60_000, nowFn);
    const crypto = new DefaultCryptoProvider();
    const signerA = new TrustSigner(crypto, nodeA.keys.privateKey, nodeA.keys.publicKey, nodeA.id, nodeA.keyId);

    const msgSigner = new MessageEnvelopeSigner(signerA);
    const validator = new MessageEnvelopeValidator(sessionManagerB, trustB);

    const e1 = msgSigner.sign({
      message_id: randomUUID(),
      session_id: session.session_id,
      sender_node_id: nodeA.id,
      recipient_node_id: nodeBId,
      timestamp: nowFn(),
      nonce: 'nonce-dup',
      payload: { a: 1 },
    });
    validator.validate(e1);

    const e2 = msgSigner.sign({
      message_id: randomUUID(),
      session_id: session.session_id,
      sender_node_id: nodeA.id,
      recipient_node_id: nodeBId,
      timestamp: nowFn(),
      nonce: 'nonce-dup',
      payload: { a: 2 },
    });

    assert.throws(
      () => validator.validate(e2 as any),
      (e: unknown) => e instanceof MessageEnvelopeError && e.code === MessageEnvelopeErrorCode.REPLAY_DETECTED,
    );
  });
});

