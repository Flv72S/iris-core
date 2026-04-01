/**
 * Microstep 14G — State Integrity Verification. Errors.
 */

export enum IntegrityErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  TRACE_STORE_CORRUPT = 'TRACE_STORE_CORRUPT',
}

export class IntegrityError extends Error {
  constructor(
    public readonly code: IntegrityErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'IntegrityError';
    Object.setPrototypeOf(this, IntegrityError.prototype);
  }
}

