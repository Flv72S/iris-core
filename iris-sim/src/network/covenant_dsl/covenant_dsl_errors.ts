/**
 * Microstep 14N — Covenant DSL / Config Layer. Errors.
 */

export enum CovenantDSLErrorCode {
  INVALID_SYNTAX = 'INVALID_SYNTAX',
  UNKNOWN_IDENTIFIER = 'UNKNOWN_IDENTIFIER',
  UNSAFE_TOKEN = 'UNSAFE_TOKEN',
  INVALID_DEFINITION = 'INVALID_DEFINITION',
}

export class CovenantDSLError extends Error {
  constructor(
    public readonly code: CovenantDSLErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CovenantDSLError';
    Object.setPrototypeOf(this, CovenantDSLError.prototype);
  }
}
