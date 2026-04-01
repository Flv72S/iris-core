/**
 * Phase 13XX-H — Cross-Network Trust Bridges. Errors.
 */

export const BridgeErrorCode = {
  BRIDGE_NOT_FOUND: 'BRIDGE_NOT_FOUND',
  INVALID_BRIDGE: 'INVALID_BRIDGE',
  INTERACTION_VALIDATION_FAILED: 'INTERACTION_VALIDATION_FAILED',
} as const;

export type BridgeErrorCode =
  (typeof BridgeErrorCode)[keyof typeof BridgeErrorCode];

export class BridgeError extends Error {
  readonly code: BridgeErrorCode;

  constructor(message: string, code: BridgeErrorCode) {
    super(message);
    this.name = 'BridgeError';
    this.code = code;
    Object.setPrototypeOf(this, BridgeError.prototype);
  }
}
