/**
 * Phase 14C — State Diff Engine. High-level diff operations.
 */

import type { NetworkState } from '../network_state.js';
import type { StateDiff } from './state_diff_types.js';
import { StateDiffGenerator } from './state_diff_generator.js';
import { StateDiffMerger } from './state_diff_merger.js';
import { StateDiffValidator } from './state_diff_validator.js';

export class StateDiffEngine {
  /**
   * Create diff from base to target. Deterministic.
   */
  static createDiff(base: NetworkState, target: NetworkState): StateDiff {
    return StateDiffGenerator.generate(base, target);
  }

  /**
   * Apply diff to state. Validates diff then merges. Returns new NetworkState.
   */
  static applyDiff(state: NetworkState, diff: StateDiff): NetworkState {
    StateDiffValidator.validate(diff);
    return StateDiffMerger.merge(state, diff);
  }
}
