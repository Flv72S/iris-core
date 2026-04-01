/**
 * Microstep 15B — Message Envelope Standard. Session binding validation.
 */

import type { SessionManager } from '../secure_session/index.js';
import type { MessageEnvelope } from './message_envelope_types.js';
import { MessageEnvelopeError, MessageEnvelopeErrorCode } from './message_envelope_errors.js';
import type { Session } from '../secure_session/index.js';
import { MessageEnvelopeVerifier } from './message_envelope_verifier.js';
import type { TrustEngine } from '../covenant_trust/index.js';
import { ReplayProtectionEngine } from '../replay_protection/index.js';
import { ReplayError, ReplayErrorCode } from '../replay_protection/index.js';

export class MessageEnvelopeValidator {
  private readonly verifier?: MessageEnvelopeVerifier;
  private readonly replay: ReplayProtectionEngine;

  constructor(
    private readonly sessionManager: SessionManager,
    trustEngine?: TrustEngine,
    replayEngine?: ReplayProtectionEngine,
  ) {
    if (trustEngine) this.verifier = new MessageEnvelopeVerifier(trustEngine);
    this.replay = replayEngine ?? new ReplayProtectionEngine();
  }

  validate(envelope: MessageEnvelope): void {
    // Enforce nonce presence + basic uniqueness
    if (typeof envelope?.nonce !== 'string' || envelope.nonce.length === 0) {
      throw new MessageEnvelopeError(MessageEnvelopeErrorCode.INVALID_STRUCTURE, 'Missing nonce');
    }

    // Session validation
    let session: Session;
    try {
      session = this.sessionManager.validateSession(envelope.session_id);
    } catch (e) {
      throw new MessageEnvelopeError(MessageEnvelopeErrorCode.INVALID_SESSION, (e as Error).message);
    }

    // Session binding rules (sender/recipient must match session endpoints)
    const local = session.node_id_local;
    const remote = session.node_id_remote;
    // From the perspective of `sessionManager`:
    // - sender must be the remote peer
    // - recipient must be the local node
    const senderOk = envelope.sender_node_id === remote && envelope.recipient_node_id === local;
    if (!senderOk) {
      throw new MessageEnvelopeError(MessageEnvelopeErrorCode.SESSION_MISMATCH, 'Sender/recipient mismatch');
    }

    // Signature verification (requires correct key_id; infer from session binding if sender is remote)
    if (this.verifier) {
      // Sender is always `session.node_id_remote` here.
      this.verifier.verify(envelope, session.key_id_remote);
    }

    // Replay protection is executed before message processing and after signature/session checks.
    try {
      this.replay.processEnvelope(envelope);
    } catch (e) {
      if (e instanceof ReplayError && e.code === ReplayErrorCode.REPLAY_DETECTED) {
        throw new MessageEnvelopeError(MessageEnvelopeErrorCode.REPLAY_DETECTED, e.message);
      }
      if (e instanceof ReplayError) {
        throw new MessageEnvelopeError(MessageEnvelopeErrorCode.INVALID_STRUCTURE, e.message);
      }
      throw e;
    }
  }
}

