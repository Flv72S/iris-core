/**
 * Microstep 15B — Message Envelope Standard. Types.
 */

export interface MessageEnvelope {
  readonly message_id: string;
  readonly session_id: string;

  readonly sender_node_id: string;
  readonly recipient_node_id: string;

  readonly timestamp: number;
  readonly nonce: string;

  readonly payload: unknown;
  readonly payload_hash: string; // sha256 hex

  readonly signature: string; // Ed25519 base64 signature from trust layer
}

export type MessageEnvelopeWithoutSignature = Omit<MessageEnvelope, 'signature' | 'payload_hash'> & {
  readonly payload: unknown;
};

