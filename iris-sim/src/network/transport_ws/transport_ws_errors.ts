/**
 * Microstep 15E.2 — WebSocket/P2P Transport. Errors.
 */

export enum WsTransportErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  SEND_FAILED = 'SEND_FAILED',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  PEER_NOT_FOUND = 'PEER_NOT_FOUND',
}

export class WsTransportError extends Error {
  constructor(
    public readonly code: WsTransportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'WsTransportError';
    Object.setPrototypeOf(this, WsTransportError.prototype);
  }
}

