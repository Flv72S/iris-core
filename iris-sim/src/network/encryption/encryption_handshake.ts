/**
 * Microstep 15C-H — Encryption Hardening. Authenticated ephemeral handshake.
 */

import type { SignedRecordEnvelope, TrustEngine, TrustSigner } from '../covenant_trust/index.js';
import type { CovenantPersistenceRecord } from '../covenant_persistence/index.js';
import { serializeDeterministic } from '../message_envelope/message_envelope_serializer.js';
import { EncryptionError, EncryptionErrorCode } from './encryption_errors.js';

export interface AuthenticatedKeyExchangePayload {
  readonly session_id: string;
  readonly sender_node_id: string;
  readonly recipient_node_id: string;
  readonly ephemeral_public_key: string;
  readonly timestamp: number;
}

function buildHandshakeRecord(payload: AuthenticatedKeyExchangePayload, condition: string): CovenantPersistenceRecord {
  return Object.freeze({
    record_id: `encryption-handshake:${payload.session_id}:${payload.sender_node_id}:${payload.recipient_node_id}:${payload.timestamp}`,
    covenant_id: 'encryption_handshake',
    version: 1,
    action: 'CREATE',
    definition: Object.freeze({
      id: `encryption-handshake-def:${payload.session_id}:${payload.sender_node_id}:${payload.recipient_node_id}`,
      name: 'AuthenticatedKeyExchange',
      enabled: true,
      severity: 'LOW',
      condition,
    }),
    timestamp: payload.timestamp,
    metadata: Object.freeze({ actor_id: payload.sender_node_id, source: 'encryption_handshake' }),
  });
}

export class AuthenticatedKeyExchangeHandshake {
  constructor(
    private readonly trustSigner: TrustSigner | null,
    private readonly trustEngine: TrustEngine,
  ) {}

  createSignedHandshake(payload: AuthenticatedKeyExchangePayload): SignedRecordEnvelope {
    if (!this.trustSigner) {
      throw new EncryptionError(EncryptionErrorCode.INVALID_HANDSHAKE, 'TrustSigner required for handshake creation');
    }
    const condition = serializeDeterministic(payload);
    const record = buildHandshakeRecord(payload, condition);
    return this.trustSigner.sign(record, { signedAt: payload.timestamp });
  }

  verifyHandshake(signed: SignedRecordEnvelope): AuthenticatedKeyExchangePayload {
    this.trustEngine.validate(signed);

    const cond = signed.record.definition.condition;
    if (typeof cond !== 'string' || cond.length === 0) {
      throw new EncryptionError(EncryptionErrorCode.INVALID_HANDSHAKE, 'Invalid handshake condition');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cond);
    } catch {
      throw new EncryptionError(EncryptionErrorCode.INVALID_HANDSHAKE, 'Handshake condition parse failed');
    }

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('session_id' in parsed) ||
      typeof (parsed as any).session_id !== 'string' ||
      typeof (parsed as any).sender_node_id !== 'string' ||
      typeof (parsed as any).recipient_node_id !== 'string' ||
      typeof (parsed as any).ephemeral_public_key !== 'string' ||
      typeof (parsed as any).timestamp !== 'number'
    ) {
      throw new EncryptionError(EncryptionErrorCode.INVALID_HANDSHAKE, 'Handshake payload structure invalid');
    }

    return parsed as AuthenticatedKeyExchangePayload;
  }
}

