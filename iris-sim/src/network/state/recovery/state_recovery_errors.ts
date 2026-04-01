/**
 * Phase 14E — State Recovery Engine. Errors.
 */

export enum RecoveryErrorCode {
  SNAPSHOT_NOT_FOUND = 'SNAPSHOT_NOT_FOUND',
  INVALID_SNAPSHOT = 'INVALID_SNAPSHOT',
  DIFF_CHAIN_INVALID = 'DIFF_CHAIN_INVALID',
  DIFF_APPLICATION_FAILED = 'DIFF_APPLICATION_FAILED',
  STATE_VALIDATION_FAILED = 'STATE_VALIDATION_FAILED',
}

export class RecoveryError extends Error {
  constructor(
    public readonly code: RecoveryErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'RecoveryError';
    Object.setPrototypeOf(this, RecoveryError.prototype);
  }
}
