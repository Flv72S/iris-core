/**
 * Phase 14A — State Model Definition. Errors.
 */

export enum StateErrorCode {
  INVALID_STATE = 'INVALID_STATE',
  DUPLICATE_NODE = 'DUPLICATE_NODE',
  INVALID_TRUST_VALUE = 'INVALID_TRUST_VALUE',
  INVALID_POLICY_REFERENCE = 'INVALID_POLICY_REFERENCE',
  INVALID_TOPOLOGY_EDGE = 'INVALID_TOPOLOGY_EDGE',
}

export class StateError extends Error {
  constructor(
    public readonly code: StateErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'StateError';
    Object.setPrototypeOf(this, StateError.prototype);
  }
}
