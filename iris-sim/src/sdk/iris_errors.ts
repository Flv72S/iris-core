/**
 * Microstep 16A — IRIS SDK errors.
 */

export enum IrisErrorCode {
  INIT_FAILED = 'INIT_FAILED',
  START_FAILED = 'START_FAILED',
  INVALID_CONFIG = 'INVALID_CONFIG',
  MODULE_FAILURE = 'MODULE_FAILURE',
}

export class IrisError extends Error {
  constructor(
    public readonly code: IrisErrorCode,
    message: string,
    public readonly hint?: string,
  ) {
    super(message);
    this.name = 'IrisError';
    Object.setPrototypeOf(this, IrisError.prototype);
  }
}

