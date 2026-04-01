/**
 * Phase 13XX-J — Cross-Network Trust Policies. Errors.
 */

export const PolicyErrorCode = {
  POLICY_NOT_FOUND: 'POLICY_NOT_FOUND',
  INVALID_POLICY: 'INVALID_POLICY',
  INTERACTION_BLOCKED: 'INTERACTION_BLOCKED',
} as const;

export type PolicyErrorCode = (typeof PolicyErrorCode)[keyof typeof PolicyErrorCode];

export class PolicyError extends Error {
  readonly code: PolicyErrorCode;

  constructor(message: string, code: PolicyErrorCode) {
    super(message);
    this.name = 'PolicyError';
    this.code = code;
    Object.setPrototypeOf(this, PolicyError.prototype);
  }
}
