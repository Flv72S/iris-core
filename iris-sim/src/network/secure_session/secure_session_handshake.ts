/**
 * Microstep 15A — Secure Session Manager. Deterministic handshake protocol.
 *
 * We intentionally reuse TrustSigner/TrustEngine by signing a deterministic record-like payload
 * embedded in a CovenantPersistenceRecord-compatible structure.
 */

import { randomUUID, createHash } from 'node:crypto';
import type { TrustEngine, TrustSigner } from '../covenant_trust/index.js';
import type { CovenantPersistenceRecord } from '../covenant_persistence/index.js';
import type { HandshakeChallenge, HandshakeInit, HandshakeResponse } from './secure_session_types.js';
import { SessionError, SessionErrorCode } from './secure_session_errors.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export interface HandshakeConfig {
  /** Maximum allowed skew/age for handshake messages (ms). */
  readonly maxSkewMs: number;
}

/**
 * Stateless until validation succeeds: pending state is kept in-memory, keyed by nonce.
 */
export class SessionHandshake {
  private readonly pendingChallenges = new Map<string, { challenge: string; created_at: number; node_id_remote: string }>();
  private readonly usedNonces = new Set<string>();

  constructor(
    private readonly node_id_local: string,
    private readonly trust: TrustEngine,
    private readonly signer: TrustSigner,
    private readonly config: HandshakeConfig = { maxSkewMs: 30_000 },
    private readonly now: () => number = Date.now,
  ) {}

  initiate(_node_id_remote: string): HandshakeInit {
    const nonce = randomUUID();
    const init: HandshakeInit = Object.freeze({
      node_id: this.node_id_local,
      timestamp: this.now(),
      nonce,
    });
    return init;
  }

  /** Remote side: create CHALLENGE from INIT. */
  challenge(init: HandshakeInit): HandshakeChallenge {
    if (this.usedNonces.has(init.nonce)) {
      throw new SessionError(SessionErrorCode.INVALID_HANDSHAKE, 'Replay nonce');
    }
    const age = Math.abs(this.now() - init.timestamp);
    if (age > this.config.maxSkewMs) {
      throw new SessionError(SessionErrorCode.INVALID_HANDSHAKE, 'Handshake init expired');
    }
    const challenge = sha256Hex(`${init.node_id}:${init.timestamp}:${init.nonce}:${this.node_id_local}`);
    this.pendingChallenges.set(init.nonce, {
      challenge,
      created_at: this.now(),
      node_id_remote: init.node_id,
    });
    return Object.freeze({
      challenge,
      node_id: this.node_id_local,
      timestamp: this.now(),
      nonce: init.nonce,
    });
  }

  /** Initiator side: sign the challenge. */
  respond(challenge: HandshakeChallenge): HandshakeResponse {
    const age = Math.abs(this.now() - challenge.timestamp);
    if (age > this.config.maxSkewMs) {
      throw new SessionError(SessionErrorCode.INVALID_HANDSHAKE, 'Handshake challenge expired');
    }

    // Sign a deterministic "handshake record" payload embedded in a record-like structure.
    const record: CovenantPersistenceRecord = Object.freeze({
      record_id: `handshake:${challenge.nonce}`,
      covenant_id: `handshake:${this.node_id_local}->${challenge.node_id}`,
      version: 1,
      action: 'CREATE',
      definition: Object.freeze({
        id: `handshake:${challenge.nonce}`,
        name: 'SecureSessionHandshake',
        enabled: true,
        severity: 'LOW',
        // condition carries the challenge and binding fields deterministically
        condition: `challenge=${challenge.challenge};remote=${challenge.node_id};nonce=${challenge.nonce};ts=${challenge.timestamp}`,
      }),
      timestamp: this.now(),
      metadata: Object.freeze({ actor_id: this.node_id_local, source: 'secure_session' }),
    });

    const envelope = this.signer.sign(record);
    return Object.freeze({ envelope, nonce: challenge.nonce });
  }

  /** Responder side: validate signed response; returns remote key binding. */
  finalize(response: HandshakeResponse): { public_key_remote: string; key_id_remote?: string; node_id_remote: string } {
    if (this.usedNonces.has(response.nonce)) {
      throw new SessionError(SessionErrorCode.INVALID_HANDSHAKE, 'Replay nonce');
    }
    const pending = this.pendingChallenges.get(response.nonce);
    if (!pending) {
      throw new SessionError(SessionErrorCode.INVALID_HANDSHAKE, 'Unknown nonce');
    }

    const age = Math.abs(this.now() - pending.created_at);
    if (age > this.config.maxSkewMs) {
      throw new SessionError(SessionErrorCode.INVALID_HANDSHAKE, 'Handshake pending expired');
    }

    // Trust validation: federation, authority, key, signature, replay protection.
    try {
      this.trust.validate(response.envelope);
    } catch (e) {
      // Map trust failures into session domain errors.
      const msg = (e as Error).message;
      const code = (e as { code?: unknown }).code;
      if (code === 'INVALID_SIGNATURE') {
        throw new SessionError(SessionErrorCode.SIGNATURE_INVALID, msg);
      }
      if (code === 'REPLAY_DETECTED') {
        throw new SessionError(SessionErrorCode.INVALID_HANDSHAKE, msg);
      }
      throw new SessionError(SessionErrorCode.UNTRUSTED_NODE, msg);
    }

    // Verify the record contains expected challenge binding.
    const cond = (response.envelope.record.definition as { condition?: unknown }).condition;
    if (typeof cond !== 'string' || !cond.includes(`challenge=${pending.challenge}`) || !cond.includes(`nonce=${response.nonce}`)) {
      throw new SessionError(SessionErrorCode.INVALID_HANDSHAKE, 'Challenge binding mismatch');
    }

    this.usedNonces.add(response.nonce);
    this.pendingChallenges.delete(response.nonce);

    const publicKey = response.envelope.public_key;
    if (typeof publicKey !== 'string' || publicKey.length === 0) {
      throw new SessionError(SessionErrorCode.INVALID_HANDSHAKE, 'Missing public key in signed response');
    }
    return {
      public_key_remote: publicKey,
      ...(response.envelope.key_id != null ? { key_id_remote: response.envelope.key_id } : {}),
      node_id_remote: pending.node_id_remote,
    };
  }
}

