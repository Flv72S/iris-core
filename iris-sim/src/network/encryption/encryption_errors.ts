/**
 * Microstep 15C — Encryption Layer. Errors.
 */

export enum EncryptionErrorCode {
  KEY_EXCHANGE_FAILED = 'KEY_EXCHANGE_FAILED',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  INVALID_AUTH_TAG = 'INVALID_AUTH_TAG',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  PAYLOAD_HASH_MISMATCH = 'PAYLOAD_HASH_MISMATCH',
  INVALID_ENVELOPE = 'INVALID_ENVELOPE',
  INVALID_HANDSHAKE = 'INVALID_HANDSHAKE',
  HANDSHAKE_VERIFICATION_FAILED = 'HANDSHAKE_VERIFICATION_FAILED',
  INVALID_HANDSHAKE_SIGNATURE = 'INVALID_HANDSHAKE_SIGNATURE',
  KEY_DERIVATION_FAILED = 'KEY_DERIVATION_FAILED',
  INVALID_SESSION_BINDING = 'INVALID_SESSION_BINDING',
}

export class EncryptionError extends Error {
  constructor(
    public readonly code: EncryptionErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'EncryptionError';
    Object.setPrototypeOf(this, EncryptionError.prototype);
  }
}

