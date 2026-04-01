/**
 * Microstep 15D — Distributed Replay Protection. Types.
 */

import type { MessageEnvelope } from '../message_envelope/message_envelope_types.js';

export interface ReplayIdentifier {
  readonly message_id: string;
  readonly nonce: string;
  readonly session_id: string;
  readonly sender_node_id: string;
  readonly recipient_node_id: string;
  readonly timestamp: number;
}

export interface ReplayValidationConfig {
  readonly max_drift_ms?: number;
  readonly max_age_ms?: number;
  readonly now?: () => number;
}

export interface ReplayNonceStoreConfig {
  readonly ttl_ms?: number;
  readonly max_entries?: number;
  readonly now?: () => number;
}

export interface ReplayDistributionEnvelope {
  readonly node_id: string;
  readonly identifiers: readonly ReplayIdentifier[];
  readonly timestamp: number;
}

export interface ReplayDistributionTransport {
  send(envelope: ReplayDistributionEnvelope): Promise<void>;
  onReceive(handler: (envelope: ReplayDistributionEnvelope) => Promise<void>): void;
}

export function replayIdentifierFromEnvelope(envelope: MessageEnvelope): ReplayIdentifier {
  return {
    message_id: envelope.message_id,
    nonce: envelope.nonce,
    session_id: envelope.session_id,
    sender_node_id: envelope.sender_node_id,
    recipient_node_id: envelope.recipient_node_id,
    timestamp: envelope.timestamp,
  };
}
