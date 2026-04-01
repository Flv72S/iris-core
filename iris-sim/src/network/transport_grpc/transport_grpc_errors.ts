/**
 * Microstep 15E.1 — gRPC Transport Plugin. Errors.
 */

export enum GrpcTransportErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  SEND_FAILED = 'SEND_FAILED',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  SERVER_ERROR = 'SERVER_ERROR',
}

export class GrpcTransportError extends Error {
  constructor(
    public readonly code: GrpcTransportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GrpcTransportError';
    Object.setPrototypeOf(this, GrpcTransportError.prototype);
  }
}
