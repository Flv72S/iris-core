/**
 * Phase 13XX-A — Node Identity & Registration Layer. Errors.
 */

export const NodeIdentityErrorCode = {
  NODE_ALREADY_REGISTERED: 'NODE_ALREADY_REGISTERED',
  INVALID_NODE_TYPE: 'INVALID_NODE_TYPE',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  UNVERIFIED_PROVIDER: 'UNVERIFIED_PROVIDER',
  NODE_NOT_FOUND: 'NODE_NOT_FOUND',
} as const;

export type NodeIdentityErrorCode =
  (typeof NodeIdentityErrorCode)[keyof typeof NodeIdentityErrorCode];

export class NodeIdentityError extends Error {
  readonly code: NodeIdentityErrorCode;

  constructor(message: string, code: NodeIdentityErrorCode) {
    super(message);
    this.name = 'NodeIdentityError';
    this.code = code;
    Object.setPrototypeOf(this, NodeIdentityError.prototype);
  }
}
