/**
 * Microstep 15A — Secure Session Manager.
 */

import { randomUUID } from 'node:crypto';
import type { TrustEngine, TrustRegistry } from '../covenant_trust/index.js';
import type { TrustSigner } from '../covenant_trust/index.js';
import { SessionError, SessionErrorCode } from './secure_session_errors.js';
import type { HandshakeChallenge, HandshakeInit, HandshakeResponse, Session } from './secure_session_types.js';
import { SessionHandshake } from './secure_session_handshake.js';
import type { SessionRegistry } from './secure_session_registry.js';

export interface SessionManagerConfig {
  readonly ttlMs: number;
  readonly maxSkewMs: number;
  readonly idleTimeoutMs?: number;
  readonly now?: () => number;
}

const MAX_CLOCK_DRIFT_MS = 30_000;
const SESSION_IDLE_TIMEOUT_MS = 5 * 60_000;

const DEFAULT_CONFIG: SessionManagerConfig = Object.freeze({
  ttlMs: 15 * 60_000,
  maxSkewMs: MAX_CLOCK_DRIFT_MS,
  idleTimeoutMs: SESSION_IDLE_TIMEOUT_MS,
});

export class SessionManager {
  private readonly cfg: SessionManagerConfig;
  private readonly handshake: SessionHandshake;
  private readonly now: () => number;

  constructor(
    private readonly registry: SessionRegistry,
    trust: TrustEngine,
    signer: TrustSigner,
    private readonly trustRegistry: TrustRegistry,
    private readonly node_id_local: string,
    config?: Partial<SessionManagerConfig>,
  ) {
    this.cfg = Object.freeze({ ...DEFAULT_CONFIG, ...(config ?? {}) });
    this.now = this.cfg.now ?? Date.now;
    this.handshake = new SessionHandshake(node_id_local, trust, signer, { maxSkewMs: this.cfg.maxSkewMs }, this.now);
  }

  initiateHandshake(node_id_remote: string): HandshakeInit {
    return this.handshake.initiate(node_id_remote);
  }

  private assertNoSessionId(input: unknown): void {
    if (input != null && typeof input === 'object' && 'session_id' in (input as Record<string, unknown>)) {
      throw new SessionError(SessionErrorCode.INVALID_HANDSHAKE, 'session_id injection is forbidden');
    }
  }

  /** Responder side: returns a challenge. */
  handleInit(init: HandshakeInit): HandshakeChallenge {
    this.assertNoSessionId(init as any);
    return this.handshake.challenge(init);
  }

  /** Initiator side: returns signed response. */
  handleChallenge(challenge: HandshakeChallenge): HandshakeResponse {
    this.assertNoSessionId(challenge as any);
    return this.handshake.respond(challenge);
  }

  /** Responder side: validate response and create session. */
  finalizeHandshake(response: HandshakeResponse): Session {
    this.assertNoSessionId(response as any);
    const binding = this.handshake.finalize(response);
    const now = this.now();
    const session: Session = Object.freeze({
      session_id: this.generateSessionId(),
      node_id_local: this.node_id_local,
      node_id_remote: binding.node_id_remote,
      public_key_remote: binding.public_key_remote,
      ...(binding.key_id_remote != null ? { key_id_remote: binding.key_id_remote } : {}),
      created_at: now,
      expires_at: now + this.cfg.ttlMs,
      last_activity_at: now,
      status: 'active',
    });
    this.registry.create(session);
    return session;
  }

  private generateSessionId(): string {
    // crypto-secure session id: only generated at session creation time
    return randomUUID();
  }

  getSession(session_id: string): Session {
    const s = this.registry.get(session_id);
    if (!s) throw new SessionError(SessionErrorCode.SESSION_NOT_FOUND, `Session not found: ${session_id}`);
    return s;
  }

  /**
   * Validates session:
   * - exists
   * - not revoked
   * - not expired (auto-expire on access)
   * - key binding still non-revoked (rotation allowed; revocation invalidates)
   */
  validateSession(session_id: string): Session {
    const s = this.getSession(session_id);
    if (s.status === 'revoked') {
      throw new SessionError(SessionErrorCode.SESSION_REVOKED, `Session revoked: ${session_id}`);
    }
    const now = this.now();

    // Clock drift hardening: session timestamps cannot be far in the future.
    if (s.last_activity_at > now + this.cfg.maxSkewMs) {
      throw new SessionError(SessionErrorCode.INVALID_HANDSHAKE, 'Session timestamp invalid (clock drift)');
    }

    if (s.status !== 'expired' && now >= s.expires_at) {
      this.registry.expire(session_id);
      throw new SessionError(SessionErrorCode.SESSION_EXPIRED, `Session expired: ${session_id}`);
    }
    if (s.status === 'expired') {
      throw new SessionError(SessionErrorCode.SESSION_EXPIRED, `Session expired: ${session_id}`);
    }

    const idleTimeoutMs = this.cfg.idleTimeoutMs ?? SESSION_IDLE_TIMEOUT_MS;
    if (idleTimeoutMs >= 0 && now - s.last_activity_at > idleTimeoutMs) {
      this.registry.expire(session_id);
      throw new SessionError(SessionErrorCode.SESSION_EXPIRED, `Session idle timed out: ${session_id}`);
    }

    // Key binding rule: session valid only if bound key is not revoked.
    const keyId = s.key_id_remote ?? 'legacy';
    const key = this.trustRegistry.getKey(s.node_id_remote, keyId);
    if (key?.revoked) {
      throw new SessionError(SessionErrorCode.SESSION_REVOKED, `Remote key revoked for session: ${session_id}`);
    }

    // Activity refresh
    this.registry.touch(session_id, now);
    const refreshed = this.getSession(session_id);
    return refreshed;
  }
}

