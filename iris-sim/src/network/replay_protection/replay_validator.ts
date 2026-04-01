/**
 * Microstep 15D — Distributed Replay Protection. Validator.
 */

import { ReplayError, ReplayErrorCode } from './replay_errors.js';
import type { ReplayIdentifier, ReplayValidationConfig } from './replay_types.js';
import { ReplayNonceStore } from './replay_nonce_store.js';

const DEFAULT_MAX_DRIFT_MS = 30_000;
const DEFAULT_MAX_AGE_MS = 5 * 60_000;

export class ReplayValidator {
  private readonly now: () => number;
  private readonly maxDriftMs: number;
  private readonly maxAgeMs: number;

  constructor(
    private readonly store: ReplayNonceStore,
    config: ReplayValidationConfig = {},
  ) {
    this.now = config.now ?? (() => Date.now());
    this.maxDriftMs = config.max_drift_ms ?? DEFAULT_MAX_DRIFT_MS;
    this.maxAgeMs = config.max_age_ms ?? DEFAULT_MAX_AGE_MS;
  }

  validate(identifier: ReplayIdentifier): void {
    if (typeof identifier.nonce !== 'string' || identifier.nonce.trim().length === 0) {
      throw new ReplayError(ReplayErrorCode.NONCE_MISSING, 'Nonce is required');
    }

    const now = this.now();
    if (identifier.timestamp < now - this.maxAgeMs) {
      throw new ReplayError(ReplayErrorCode.INVALID_TIMESTAMP, 'Timestamp too old');
    }
    if (identifier.timestamp > now + this.maxDriftMs) {
      throw new ReplayError(ReplayErrorCode.INVALID_TIMESTAMP, 'Timestamp too far in future');
    }

    if (this.store.has(identifier)) {
      throw new ReplayError(ReplayErrorCode.REPLAY_DETECTED, 'Replay detected');
    }
  }
}
