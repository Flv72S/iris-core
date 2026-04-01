/**
 * Microstep 14H — Persistent Consensus Log (Append-only, audit-grade).
 */

export enum ConsensusLogEntryType {
  PROPOSAL_CREATED,
  VOTE_COLLECTED,
  CONSENSUS_REACHED,
  CONSENSUS_FAILED,
}

export enum ConsensusLogIntegrityErrorCode {
  INVALID_ENTRY = 'INVALID_ENTRY',
  HASH_MISMATCH = 'HASH_MISMATCH',
  CHAIN_BROKEN = 'CHAIN_BROKEN',
  DESERIALIZE_FAILED = 'DESERIALIZE_FAILED',
  STORAGE_WRITE_FAILED = 'STORAGE_WRITE_FAILED',
}

export class ConsensusLogIntegrityError extends Error {
  constructor(
    public readonly code: ConsensusLogIntegrityErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ConsensusLogIntegrityError';
    Object.setPrototypeOf(this, ConsensusLogIntegrityError.prototype);
  }
}

