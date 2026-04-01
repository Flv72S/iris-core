/**
 * Microstep 15C — Encryption Layer. Types.
 */

export interface EncryptionSession {
  readonly session_id: string;

  readonly sender_node_id: string;
  readonly recipient_node_id: string;

  readonly local_ephemeral_private: string;
  readonly local_ephemeral_public: string;

  readonly remote_ephemeral_public: string;

  readonly shared_secret: string; // base64

  readonly encryption_key: string; // base64

  // Epoch ms. Ephemeral private keys are destroyed when the secure session expires.

  readonly created_at: number;
}

export interface EncryptedEnvelope {
  readonly message_id: string;
  readonly session_id: string;

  readonly sender_node_id: string;
  readonly recipient_node_id: string;

  readonly timestamp: number;
  readonly nonce: string;

  readonly encrypted_payload: string; // base64 ciphertext
  readonly iv: string; // base64 iv
  readonly auth_tag: string; // base64 auth tag

  readonly payload_hash: string;
  readonly signature: string;
}

export type EncryptedPayloadParts = {
  readonly ciphertext: string;
  readonly iv: string;
  readonly auth_tag: string;
};

