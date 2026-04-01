/**
 * Phase 14D — Conflict Resolution Engine. Post-resolution state integrity.
 */

import type { NetworkState } from '../network_state.js';
import { StateValidator } from '../state_validator.js';

export class ConflictValidator {
  /**
   * Validate that resolved state preserves integrity. Throws if invalid.
   */
  static validate(state: NetworkState): boolean {
    return StateValidator.validate(state);
  }
}
