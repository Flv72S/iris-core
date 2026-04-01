/**
 * Microstep 15B — Message Envelope Standard. Verifier.
 */

import type { TrustEngine } from '../covenant_trust/index.js';
import type { MessageEnvelope } from './message_envelope_types.js';
import { computePayloadHash } from './message_envelope_signer.js';
import { serializeDeterministic } from './message_envelope_serializer.js';
import { MessageEnvelopeError, MessageEnvelopeErrorCode } from './message_envelope_errors.js';
import type { CovenantPersistenceRecord } from '../covenant_persistence/index.js';

function isUuidV4(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function buildVerificationRecord(envelope: MessageEnvelope, payload_hash: string): CovenantPersistenceRecord {
  const scope = {
    message_id: envelope.message_id,
    session_id: envelope.session_id,
    sender_node_id: envelope.sender_node_id,
    recipient_node_id: envelope.recipient_node_id,
    timestamp: envelope.timestamp,
    nonce: envelope.nonce,
    payload_hash,
  };

  return Object.freeze({
    record_id: `message:${envelope.message_id}`,
    covenant_id: `message:${envelope.sender_node_id}->${envelope.recipient_node_id}`,
    version: 1,
    action: 'UPDATE',
    definition: Object.freeze({
      id: `message-def:${envelope.message_id}`,
      name: 'MessageEnvelope',
      enabled: true,
      severity: 'LOW',
      condition: serializeDeterministic(scope),
    }),
    timestamp: envelope.timestamp,
    metadata: Object.freeze({ actor_id: envelope.sender_node_id, source: 'message_envelope' }),
  });
}

export class MessageEnvelopeVerifier {
  constructor(private readonly trustEngine: TrustEngine) {}

  /**
   * keyIdHint lets the caller (via session binding) supply the correct key_id for signature scope.
   */
  verify(envelope: MessageEnvelope, keyIdHint?: string): void {
    // 1. validate structure
    if (
      !envelope ||
      typeof envelope.message_id !== 'string' ||
      !isUuidV4(envelope.message_id) ||
      typeof envelope.session_id !== 'string' ||
      envelope.session_id.length === 0 ||
      typeof envelope.sender_node_id !== 'string' ||
      envelope.sender_node_id.length === 0 ||
      typeof envelope.recipient_node_id !== 'string' ||
      envelope.recipient_node_id.length === 0 ||
      typeof envelope.timestamp !== 'number' ||
      !Number.isFinite(envelope.timestamp) ||
      typeof envelope.nonce !== 'string' ||
      envelope.nonce.length === 0 ||
      typeof envelope.payload_hash !== 'string' ||
      typeof envelope.signature !== 'string'
    ) {
      throw new MessageEnvelopeError(MessageEnvelopeErrorCode.INVALID_STRUCTURE, 'Invalid envelope structure');
    }

    // 2. recompute payload_hash
    const expectedPayloadHash = computePayloadHash(envelope.payload);

    // 3. compare payload_hash
    if (expectedPayloadHash !== envelope.payload_hash) {
      throw new MessageEnvelopeError(MessageEnvelopeErrorCode.PAYLOAD_TAMPERED, 'payload_hash mismatch');
    }

    // 4. verify signature via TrustEngine
    const record = buildVerificationRecord(envelope, expectedPayloadHash);
    try {
      const signed = {
        record,
        signature: envelope.signature,
        node_id: envelope.sender_node_id,
        signed_at: envelope.timestamp,
        ...(keyIdHint != null ? { key_id: keyIdHint } : {}),
      };
      this.trustEngine.validate(signed as any);
    } catch (e) {
      const code = (e as { code?: unknown }).code;
      switch (code) {
        case 'REPLAY_DETECTED':
          throw new MessageEnvelopeError(MessageEnvelopeErrorCode.REPLAY_DETECTED, 'Replay detected');
        case 'INVALID_SIGNATURE':
          throw new MessageEnvelopeError(MessageEnvelopeErrorCode.INVALID_SIGNATURE, 'Invalid signature');
        default:
          throw new MessageEnvelopeError(MessageEnvelopeErrorCode.INVALID_SIGNATURE, (e as Error).message);
      }
    }

    // 5. validate sender identity is covered by trustEngine.validate() using sender_node_id.
  }
}

