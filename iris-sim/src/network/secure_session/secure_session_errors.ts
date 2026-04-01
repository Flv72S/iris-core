/**
 * Microstep 15A — Secure Session Manager. Errors.
 */

export enum SessionErrorCode {
  INVALID_HANDSHAKE = 'INVALID_HANDSHAKE',
  UNTRUSTED_NODE = 'UNTRUSTED_NODE',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_REVOKED = 'SESSION_REVOKED',
}

export class SessionError extends Error {
  constructor(
    public readonly code: SessionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SessionError';
    Object.setPrototypeOf(this, SessionError.prototype);
  }
}

