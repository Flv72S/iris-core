/**
 * Phase 14E — State Recovery Engine. Validates reconstructed state.
 */

import type { NetworkState } from '../network_state.js';
import { StateValidator } from '../state_validator.js';
import { RecoveryError, RecoveryErrorCode } from './state_recovery_errors.js';

export class StateRecoveryValidator {
  /**
   * Validate recovered state. Throws RecoveryError if invalid.
   */
  static validate(state: NetworkState): boolean {
    try {
      return StateValidator.validate(state);
    } catch (e) {
      throw new RecoveryError(
        RecoveryErrorCode.STATE_VALIDATION_FAILED,
        e instanceof Error ? e.message : String(e)
      );
    }
  }
}
