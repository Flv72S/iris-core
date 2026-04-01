/**
 * Microstep 15C-H — Encryption Hardening. End-to-End encryption with:
 * - authenticated ephemeral handshake (signed via TrustEngine)
 * - HKDF-based session-bound keys
 * - strict session binding for cryptographic isolation
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import type { SessionManager, Session } from '../secure_session/index.js';
import type { MessageEnvelope } from '../message_envelope/message_envelope_types.js';
import { computePayloadHash, serializeDeterministic } from '../message_envelope/index.js';
import { KeyExchange } from './encryption_key_exchange.js';
import { deriveKeys } from './encryption_kdf.js';
import type { EncryptionSession, EncryptedEnvelope } from './encryption_types.js';
import { EncryptionError, EncryptionErrorCode } from './encryption_errors.js';
import { AuthenticatedKeyExchangeHandshake } from './encryption_handshake.js';
import type { SignedRecordEnvelope, TrustEngine } from '../covenant_trust/index.js';

function sessionKey(session_id: string, sender_node_id: string, recipient_node_id: string): string {
  return `${session_id}::${sender_node_id}::${recipient_node_id}`;
}

export function encryptPayload(
  plaintext: string,
  key: string,
): { ciphertext: string; iv: string; auth_tag: string } {
  try {
    const keyBuf = Buffer.from(key, 'base64'); // 32 bytes for AES-256
    const ivBuf = randomBytes(12); // 96-bit IV for GCM
    const cipher = createCipheriv('aes-256-gcm', keyBuf, ivBuf);
    const ciphertextBuf = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTagBuf = cipher.getAuthTag();
    return {
      ciphertext: ciphertextBuf.toString('base64'),
      iv: ivBuf.toString('base64'),
      auth_tag: authTagBuf.toString('base64'),
    };
  } catch (e) {
    throw new EncryptionError(EncryptionErrorCode.ENCRYPTION_FAILED, 'Encryption failed', e);
  }
}

export function decryptPayload(ciphertext: string, key: string, iv: string, auth_tag: string): string {
  try {
    const keyBuf = Buffer.from(key, 'base64');
    const ivBuf = Buffer.from(iv, 'base64');
    const ctBuf = Buffer.from(ciphertext, 'base64');
    const tagBuf = Buffer.from(auth_tag, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', keyBuf, ivBuf);
    decipher.setAuthTag(tagBuf);

    const plaintextBuf = Buffer.concat([decipher.update(ctBuf), decipher.final()]);
    return plaintextBuf.toString('utf8');
  } catch (e) {
    throw new EncryptionError(EncryptionErrorCode.INVALID_AUTH_TAG, 'Invalid auth tag or key mismatch', e);
  }
}

export class EncryptionEngine {
  private readonly sessions = new Map<string, EncryptionSession>();

  constructor(
    private readonly sessionManager: SessionManager,
    private readonly trustEngine: TrustEngine,
  ) {}

  initializeEncryptionSession(session_id: string, remoteHandshake: SignedRecordEnvelope): EncryptionSession {
    let session: Session;
    try {
      session = this.sessionManager.validateSession(session_id);
    } catch (e) {
      this.deleteSessionContexts(session_id);
      throw new EncryptionError(EncryptionErrorCode.SESSION_NOT_FOUND, 'Secure session not found/expired', e);
    }

    // 1) verify remote handshake authenticity and integrity
    const verifier = new AuthenticatedKeyExchangeHandshake(null, this.trustEngine);
    let payload: { session_id: string; sender_node_id: string; recipient_node_id: string; ephemeral_public_key: string; timestamp: number };
    try {
      payload = verifier.verifyHandshake(remoteHandshake);
    } catch (e) {
      const code = (e as { code?: unknown }).code;
      if (code === 'INVALID_SIGNATURE') {
        throw new EncryptionError(EncryptionErrorCode.INVALID_HANDSHAKE_SIGNATURE, 'Invalid handshake signature', e);
      }
      throw new EncryptionError(EncryptionErrorCode.HANDSHAKE_VERIFICATION_FAILED, 'Handshake verification failed', e);
    }

    // 2) strict session binding
    if (payload.session_id !== session_id) {
      throw new EncryptionError(EncryptionErrorCode.INVALID_SESSION_BINDING, 'Handshake session_id mismatch');
    }
    // payload is expected to represent the remote peer -> local peer direction
    if (payload.sender_node_id !== session.node_id_remote || payload.recipient_node_id !== session.node_id_local) {
      throw new EncryptionError(EncryptionErrorCode.INVALID_SESSION_BINDING, 'Handshake sender/recipient mismatch');
    }

    // 3) generate local ephemeral key material (X25519)
    const ke = new KeyExchange();
    const local = ke.generateEphemeralKeyPair();
    const shared_secret_buf = ke.deriveSharedSecret(local.privateKey, payload.ephemeral_public_key);
    const shared_secret_b64 = shared_secret_buf.toString('base64');

    const created_at = Date.now();

    // 4) derive encryption keys (HKDF) for both directions
    const { encryption_key: kLocalToRemote } = deriveKeys(
      shared_secret_buf,
      session_id,
      session.node_id_local,
      session.node_id_remote,
    );
    const { encryption_key: kRemoteToLocal } = deriveKeys(
      shared_secret_buf,
      session_id,
      session.node_id_remote,
      session.node_id_local,
    );

    const localToRemote: EncryptionSession = Object.freeze({
      session_id,
      sender_node_id: session.node_id_local,
      recipient_node_id: session.node_id_remote,
      local_ephemeral_private: local.privateKey,
      local_ephemeral_public: local.publicKey,
      remote_ephemeral_public: payload.ephemeral_public_key,
      shared_secret: shared_secret_b64,
      encryption_key: kLocalToRemote.toString('base64'),
      created_at,
    });

    const remoteToLocal: EncryptionSession = Object.freeze({
      session_id,
      sender_node_id: session.node_id_remote,
      recipient_node_id: session.node_id_local,
      local_ephemeral_private: local.privateKey,
      local_ephemeral_public: local.publicKey,
      remote_ephemeral_public: payload.ephemeral_public_key,
      shared_secret: shared_secret_b64,
      encryption_key: kRemoteToLocal.toString('base64'),
      created_at,
    });

    this.sessions.set(sessionKey(session_id, localToRemote.sender_node_id, localToRemote.recipient_node_id), localToRemote);
    this.sessions.set(sessionKey(session_id, remoteToLocal.sender_node_id, remoteToLocal.recipient_node_id), remoteToLocal);

    // Return the direction that matches the remote handshake payload:
    // remote sender -> local recipient.
    return remoteToLocal;
  }

  private deleteSessionContexts(session_id: string): void {
    for (const key of this.sessions.keys()) {
      if (key.startsWith(`${session_id}::`)) this.sessions.delete(key);
    }
  }

  private getEncryptionSessionOrThrow(session_id: string, sender_node_id: string, recipient_node_id: string): EncryptionSession {
    // validate secure session first; this will throw if expired/revoked.
    try {
      this.sessionManager.validateSession(session_id);
    } catch (e) {
      this.deleteSessionContexts(session_id);
      throw new EncryptionError(EncryptionErrorCode.SESSION_NOT_FOUND, 'Secure session not found/expired', e);
    }

    const key = sessionKey(session_id, sender_node_id, recipient_node_id);
    const ctx = this.sessions.get(key);
    if (!ctx) {
      throw new EncryptionError(EncryptionErrorCode.INVALID_SESSION_BINDING, 'Encryption session not initialized via signed handshake');
    }
    return ctx;
  }

  encryptEnvelope(envelope: MessageEnvelope): EncryptedEnvelope {
    const ctx = this.getEncryptionSessionOrThrow(
      envelope.session_id,
      envelope.sender_node_id,
      envelope.recipient_node_id,
    );

    const expectedHash = computePayloadHash(envelope.payload);
    if (expectedHash !== envelope.payload_hash) {
      throw new EncryptionError(EncryptionErrorCode.PAYLOAD_HASH_MISMATCH, 'payload_hash does not match envelope payload');
    }

    const plaintext = serializeDeterministic(envelope.payload);
    const parts = encryptPayload(plaintext, ctx.encryption_key);

    return Object.freeze({
      message_id: envelope.message_id,
      session_id: envelope.session_id,
      sender_node_id: envelope.sender_node_id,
      recipient_node_id: envelope.recipient_node_id,
      timestamp: envelope.timestamp,
      nonce: envelope.nonce,
      encrypted_payload: parts.ciphertext,
      iv: parts.iv,
      auth_tag: parts.auth_tag,
      payload_hash: envelope.payload_hash,
      signature: envelope.signature,
    });
  }

  decryptEnvelope(encrypted: EncryptedEnvelope): MessageEnvelope {
    const ctx = this.getEncryptionSessionOrThrow(
      encrypted.session_id,
      encrypted.sender_node_id,
      encrypted.recipient_node_id,
    );

    const plaintext = decryptPayload(
      encrypted.encrypted_payload,
      ctx.encryption_key,
      encrypted.iv,
      encrypted.auth_tag,
    );

    let payload: unknown;
    try {
      payload = JSON.parse(plaintext);
    } catch (e) {
      throw new EncryptionError(EncryptionErrorCode.DECRYPTION_FAILED, 'Decrypted payload is not valid JSON', e);
    }

    const computedHash = computePayloadHash(payload);
    if (computedHash !== encrypted.payload_hash) {
      throw new EncryptionError(EncryptionErrorCode.PAYLOAD_HASH_MISMATCH, 'payload_hash mismatch after decryption');
    }

    return Object.freeze({
      message_id: encrypted.message_id,
      session_id: encrypted.session_id,
      sender_node_id: encrypted.sender_node_id,
      recipient_node_id: encrypted.recipient_node_id,
      timestamp: encrypted.timestamp,
      nonce: encrypted.nonce,
      payload,
      payload_hash: encrypted.payload_hash,
      signature: encrypted.signature,
    });
  }
}

