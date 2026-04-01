/**
 * Microstep 14O — Covenant Persistence Layer. Errors.
 */

export enum CovenantPersistenceErrorCode {
  DUPLICATE_CREATE = 'DUPLICATE_CREATE',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_UPDATE = 'INVALID_UPDATE',
}

export class CovenantPersistenceError extends Error {
  constructor(
    public readonly code: CovenantPersistenceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CovenantPersistenceError';
    Object.setPrototypeOf(this, CovenantPersistenceError.prototype);
  }
}
