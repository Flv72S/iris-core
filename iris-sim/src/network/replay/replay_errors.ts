/**
 * Microstep 14I — Deterministic Replay Engine. Errors.
 */

export enum ReplayErrorType {
  NON_DETERMINISTIC = 'NON_DETERMINISTIC',
  INVALID_EVENT_SEQUENCE = 'INVALID_EVENT_SEQUENCE',
  STATE_MISMATCH = 'STATE_MISMATCH',
  MISSING_EVENT = 'MISSING_EVENT',
  INVALID_HASH_CHAIN = 'INVALID_HASH_CHAIN',
}

export interface ReplayError {
  readonly type: ReplayErrorType;
  readonly message: string;
  readonly entry_id?: string;
}

