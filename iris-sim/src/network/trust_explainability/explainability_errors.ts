/**
 * Phase 13XX-F — Trust Explainability Engine. Errors.
 */

export const ExplainabilityErrorCode = {
  INVALID_INPUT: 'INVALID_INPUT',
} as const;

export type ExplainabilityErrorCode =
  (typeof ExplainabilityErrorCode)[keyof typeof ExplainabilityErrorCode];

export class ExplainabilityError extends Error {
  readonly code: ExplainabilityErrorCode;

  constructor(message: string, code: ExplainabilityErrorCode) {
    super(message);
    this.name = 'ExplainabilityError';
    this.code = code;
    Object.setPrototypeOf(this, ExplainabilityError.prototype);
  }
}
