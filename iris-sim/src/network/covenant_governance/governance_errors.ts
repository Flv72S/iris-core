/**
 * Microstep 14Q — Identity & Governance Layer. Errors.
 */

export enum GovernanceErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  NO_ROLES = 'NO_ROLES',
  INVALID_ACTOR = 'INVALID_ACTOR',
}

export class GovernanceError extends Error {
  constructor(
    public readonly code: GovernanceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GovernanceError';
    Object.setPrototypeOf(this, GovernanceError.prototype);
  }
}
