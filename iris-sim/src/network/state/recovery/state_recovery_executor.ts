/**
 * Phase 14E — State Recovery Engine. Execute recovery plan (sequential diff replay).
 */

import type { NetworkState } from '../network_state.js';
import type { RecoveryPlan } from './recovery_types.js';
import type { StateDiff } from '../diff/state_diff_types.js';
import { StateDiffEngine } from '../diff/state_diff_engine.js';
import { RecoveryError, RecoveryErrorCode } from './state_recovery_errors.js';

/**
 * Execute recovery: apply diff_chain sequentially from base_state.
 * Each diff must have base_version matching current state version (enforced).
 */
export class StateRecoveryExecutor {
  static execute(
    base_state: NetworkState,
    plan: RecoveryPlan,
    getDiff: (id: string) => StateDiff | null
  ): NetworkState {
    let state = base_state;
    let applied = 0;
    for (const id of plan.diff_chain) {
      const diff = getDiff(id);
      if (diff == null) {
        throw new RecoveryError(RecoveryErrorCode.DIFF_CHAIN_INVALID, `Diff not found: ${id}`);
      }
      if (diff.metadata.base_version !== state.metadata.version) {
        throw new RecoveryError(
          RecoveryErrorCode.DIFF_APPLICATION_FAILED,
          `Diff ${id} base_version ${diff.metadata.base_version} does not match state version ${state.metadata.version}`
        );
      }
      try {
        state = StateDiffEngine.applyDiff(state, diff);
        applied += 1;
      } catch (e) {
        throw new RecoveryError(
          RecoveryErrorCode.DIFF_APPLICATION_FAILED,
          `Failed to apply diff ${id}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
    return state;
  }
}
