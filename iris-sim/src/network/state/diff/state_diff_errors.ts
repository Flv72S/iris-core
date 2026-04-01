/**
 * Phase 14C — State Diff Engine. Errors.
 */

export enum StateDiffErrorCode {
  INVALID_DIFF = 'INVALID_DIFF',
  INVALID_VERSION_ORDER = 'INVALID_VERSION_ORDER',
  INVALID_NODE_REFERENCE = 'INVALID_NODE_REFERENCE',
  INVALID_TOPOLOGY_REFERENCE = 'INVALID_TOPOLOGY_REFERENCE',
  INVALID_OPERATION = 'INVALID_OPERATION',
}

export class StateDiffError extends Error {
  constructor(
    public readonly code: StateDiffErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'StateDiffError';
    Object.setPrototypeOf(this, StateDiffError.prototype);
  }
}
