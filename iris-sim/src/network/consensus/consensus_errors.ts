/**
 * Phase 14F — Consensus Coordination Layer. Errors.
 */

export enum ConsensusErrorCode {
  INVALID_PROPOSAL = 'INVALID_PROPOSAL',
  QUORUM_NOT_REACHED = 'QUORUM_NOT_REACHED',
  INVALID_VOTE = 'INVALID_VOTE',
  STATE_TRANSITION_ERROR = 'STATE_TRANSITION_ERROR',
}

export class ConsensusError extends Error {
  constructor(
    public readonly code: ConsensusErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ConsensusError';
    Object.setPrototypeOf(this, ConsensusError.prototype);
  }
}
