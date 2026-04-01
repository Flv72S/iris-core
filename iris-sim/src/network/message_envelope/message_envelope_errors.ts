/**
 * Microstep 15B — Message Envelope Standard. Errors.
 */

export enum MessageEnvelopeErrorCode {
  INVALID_STRUCTURE = 'INVALID_STRUCTURE',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  PAYLOAD_TAMPERED = 'PAYLOAD_TAMPERED',
  INVALID_SESSION = 'INVALID_SESSION',
  SESSION_MISMATCH = 'SESSION_MISMATCH',
  REPLAY_DETECTED = 'REPLAY_DETECTED',
}

export class MessageEnvelopeError extends Error {
  constructor(
    public readonly code: MessageEnvelopeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MessageEnvelopeError';
    Object.setPrototypeOf(this, MessageEnvelopeError.prototype);
  }
}

