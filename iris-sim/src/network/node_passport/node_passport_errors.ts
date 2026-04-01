/**
 * Phase 13XX-C — Node Passport System. Errors.
 */

export const NodePassportErrorCode = {
  PASSPORT_NOT_FOUND: 'PASSPORT_NOT_FOUND',
  INVALID_TRUST_SCORE: 'INVALID_TRUST_SCORE',
  INVALID_REPUTATION_SCORE: 'INVALID_REPUTATION_SCORE',
} as const;

export type NodePassportErrorCode =
  (typeof NodePassportErrorCode)[keyof typeof NodePassportErrorCode];

export class NodePassportError extends Error {
  readonly code: NodePassportErrorCode;

  constructor(message: string, code: NodePassportErrorCode) {
    super(message);
    this.name = 'NodePassportError';
    this.code = code;
    Object.setPrototypeOf(this, NodePassportError.prototype);
  }
}
