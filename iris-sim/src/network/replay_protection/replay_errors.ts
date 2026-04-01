/**
 * Microstep 15D — Distributed Replay Protection. Errors.
 */

export enum ReplayErrorCode {
  REPLAY_DETECTED = 'REPLAY_DETECTED',
  INVALID_TIMESTAMP = 'INVALID_TIMESTAMP',
  NONCE_MISSING = 'NONCE_MISSING',
  DISTRIBUTION_INVALID = 'DISTRIBUTION_INVALID',
}

export class ReplayError extends Error {
  constructor(
    public readonly code: ReplayErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ReplayError';
    Object.setPrototypeOf(this, ReplayError.prototype);
  }
}
