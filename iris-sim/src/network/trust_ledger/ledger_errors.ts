/**
 * Phase 13XX-G — Trust Ledger. Errors.
 */

export const LedgerErrorCode = {
  CORRUPTION_DETECTED: 'CORRUPTION_DETECTED',
  DUPLICATE_ENTRY_ID: 'DUPLICATE_ENTRY_ID',
} as const;

export type LedgerErrorCode =
  (typeof LedgerErrorCode)[keyof typeof LedgerErrorCode];

export class LedgerError extends Error {
  readonly code: LedgerErrorCode;

  constructor(message: string, code: LedgerErrorCode) {
    super(message);
    this.name = 'LedgerError';
    this.code = code;
    Object.setPrototypeOf(this, LedgerError.prototype);
  }
}
