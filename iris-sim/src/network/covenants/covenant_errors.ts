/**
 * Microstep 14L — AI Covenant Monitoring Platform. Errors.
 */

export enum CovenantErrorCode {
  COVENANT_THREW = 'COVENANT_THREW',
  INVALID_COVENANT = 'INVALID_COVENANT',
  REGISTRY_DUPLICATE = 'REGISTRY_DUPLICATE',
}

export class CovenantError extends Error {
  constructor(
    public readonly code: CovenantErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CovenantError';
    Object.setPrototypeOf(this, CovenantError.prototype);
  }
}
