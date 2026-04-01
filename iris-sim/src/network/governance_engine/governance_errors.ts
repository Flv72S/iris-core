/**
 * Phase 13XX-E — Governance Decision Engine. Errors.
 */

export const GovernanceErrorCode = {
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  INVALID_DECISION: 'INVALID_DECISION',
} as const;

export type GovernanceErrorCode =
  (typeof GovernanceErrorCode)[keyof typeof GovernanceErrorCode];

export class GovernanceError extends Error {
  readonly code: GovernanceErrorCode;

  constructor(message: string, code: GovernanceErrorCode) {
    super(message);
    this.name = 'GovernanceError';
    this.code = code;
    Object.setPrototypeOf(this, GovernanceError.prototype);
  }
}
