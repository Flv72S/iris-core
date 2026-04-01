/**
 * Microstep 15B — Message Envelope Standard. Signer.
 */

import { createHash } from 'node:crypto';
import type { TrustSigner } from '../covenant_trust/index.js';
import type { MessageEnvelope, MessageEnvelopeWithoutSignature } from './message_envelope_types.js';
import { serializeDeterministic } from './message_envelope_serializer.js';
import { MessageEnvelopeError, MessageEnvelopeErrorCode } from './message_envelope_errors.js';
import type { CovenantPersistenceRecord } from '../covenant_persistence/index.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function isUuidV4(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function computePayloadHash(payload: unknown): string {
  return sha256Hex(serializeDeterministic(payload));
}

function buildHandshakeRecord(scope: Record<string, unknown>, signedAt: number, sender: string, recipient: string, message_id: string) {
  const record: CovenantPersistenceRecord = Object.freeze({
    record_id: `message:${message_id}`,
    covenant_id: `message:${sender}->${recipient}`,
    version: 1,
    action: 'UPDATE',
    definition: Object.freeze({
      id: `message-def:${message_id}`,
      name: 'MessageEnvelope',
      enabled: true,
      severity: 'LOW',
      condition: serializeDeterministic(scope),
    }),
    timestamp: signedAt,
    metadata: Object.freeze({ actor_id: sender, source: 'message_envelope' }),
  });
  return record;
}

export class MessageEnvelopeSigner {
  constructor(private readonly trustSigner: TrustSigner) {}

  sign(input: MessageEnvelopeWithoutSignature): MessageEnvelope {
    if (!isUuidV4(input.message_id)) {
      throw new MessageEnvelopeError(MessageEnvelopeErrorCode.INVALID_STRUCTURE, 'Invalid message_id (UUID v4)');
    }
    if (typeof input.session_id !== 'string' || input.session_id.length === 0) {
      throw new MessageEnvelopeError(MessageEnvelopeErrorCode.INVALID_STRUCTURE, 'Missing session_id');
    }
    if (typeof input.sender_node_id !== 'string' || input.sender_node_id.length === 0) {
      throw new MessageEnvelopeError(MessageEnvelopeErrorCode.INVALID_STRUCTURE, 'Missing sender_node_id');
    }
    if (typeof input.recipient_node_id !== 'string' || input.recipient_node_id.length === 0) {
      throw new MessageEnvelopeError(MessageEnvelopeErrorCode.INVALID_STRUCTURE, 'Missing recipient_node_id');
    }
    if (!Number.isFinite(input.timestamp)) {
      throw new MessageEnvelopeError(MessageEnvelopeErrorCode.INVALID_STRUCTURE, 'Missing/invalid timestamp');
    }
    if (typeof input.nonce !== 'string' || input.nonce.length === 0) {
      throw new MessageEnvelopeError(MessageEnvelopeErrorCode.INVALID_STRUCTURE, 'Missing nonce');
    }

    const payload_hash = computePayloadHash(input.payload);
    const scope = {
      message_id: input.message_id,
      session_id: input.session_id,
      sender_node_id: input.sender_node_id,
      recipient_node_id: input.recipient_node_id,
      timestamp: input.timestamp,
      nonce: input.nonce,
      payload_hash,
    };

    const record = buildHandshakeRecord(scope, input.timestamp, input.sender_node_id, input.recipient_node_id, input.message_id);
    const signed = this.trustSigner.sign(record, { signedAt: input.timestamp });

    return Object.freeze({
      ...input,
      payload_hash,
      signature: signed.signature,
    });
  }
}

