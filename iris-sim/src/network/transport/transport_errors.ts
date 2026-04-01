/**
 * Microstep 15E — Transport Abstraction Layer. Errors.
 */

export enum TransportErrorCode {
  SEND_FAILED = 'SEND_FAILED',
  RECEIVE_FAILED = 'RECEIVE_FAILED',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  UNSUPPORTED_TRANSPORT = 'UNSUPPORTED_TRANSPORT',
}

export class TransportError extends Error {
  constructor(
    public readonly code: TransportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'TransportError';
    Object.setPrototypeOf(this, TransportError.prototype);
  }
}

