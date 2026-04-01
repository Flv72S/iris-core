/**
 * Microstep 15A — Secure Session Manager. Types.
 */

import type { SignedRecordEnvelope } from '../covenant_trust/index.js';

export type SessionStatus = 'active' | 'expired' | 'revoked';

export interface Session {
  readonly session_id: string;
  readonly node_id_local: string;
  readonly node_id_remote: string;

  readonly public_key_remote: string;
  readonly key_id_remote?: string;

  readonly created_at: number;
  readonly expires_at: number;

  /** Updated on each successful validateSession() call. */
  readonly last_activity_at: number;

  readonly status: SessionStatus;
}

export interface HandshakeInit {
  readonly node_id: string;
  readonly timestamp: number;
  readonly nonce: string;
}

export interface HandshakeChallenge {
  readonly challenge: string;
  readonly node_id: string;
  readonly timestamp: number;
  readonly nonce: string;
}

export interface HandshakeResponse {
  /** Signed response (challenge binding). */
  readonly envelope: SignedRecordEnvelope;
  /** Echo nonce to bind INIT. */
  readonly nonce: string;
}

