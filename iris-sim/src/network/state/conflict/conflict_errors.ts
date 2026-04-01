/**
 * Phase 14D — Conflict Resolution Engine. Errors.
 */

export enum ConflictErrorCode {
  INVALID_CONFLICT = 'INVALID_CONFLICT',
  INVALID_RESOLUTION = 'INVALID_RESOLUTION',
  VECTOR_CLOCK_INCONSISTENT = 'VECTOR_CLOCK_INCONSISTENT',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
}

export class ConflictError extends Error {
  constructor(
    public readonly code: ConflictErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}
