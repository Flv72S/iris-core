/**
 * Phase 14E — State Recovery Engine. High-level orchestrator.
 */

import type { NetworkState } from '../network_state.js';
import type { RecoveryResult } from './recovery_types.js';
import type { StateDiff } from '../diff/state_diff_types.js';
import { StateRecoveryPlanner } from './state_recovery_planner.js';
import type { DiffMeta } from './state_recovery_planner.js';
import { StateRecoveryExecutor } from './state_recovery_executor.js';
import { StateRecoveryValidator } from './state_recovery_validator.js';
import { RecoveryError, RecoveryErrorCode } from './state_recovery_errors.js';

export interface RecoverStateParams {
  readonly snapshot: NetworkState;
  readonly target_version: number;
  readonly available_diff_ids: readonly string[];
  readonly getDiffMeta: (id: string) => DiffMeta | null;
  readonly getDiff: (id: string) => StateDiff | null;
}

export interface RecoverStateOutput {
  readonly result: RecoveryResult;
  readonly state: NetworkState;
}

/**
 * Recover state from snapshot and diffs. Deterministic and synchronous.
 * Caller provides snapshot and diff accessors.
 */
export class StateRecoveryEngine {
  static recoverState(params: RecoverStateParams): RecoverStateOutput {
    const { snapshot, target_version, available_diff_ids, getDiffMeta, getDiff } = params;
    const snapshot_version = snapshot.metadata.version;

    if (snapshot_version > target_version) {
      StateRecoveryValidator.validate(snapshot);
      return {
        result: { success: true, recovered_version: snapshot_version, applied_diffs: 0 },
        state: snapshot,
      };
    }

    const plan = StateRecoveryPlanner.planRecovery(
      snapshot_version,
      target_version,
      available_diff_ids,
      getDiffMeta
    );

    let state: NetworkState;
    try {
      state = StateRecoveryExecutor.execute(snapshot, plan, getDiff);
    } catch (e) {
      if (e instanceof RecoveryError) throw e;
      throw new RecoveryError(
        RecoveryErrorCode.DIFF_APPLICATION_FAILED,
        e instanceof Error ? e.message : String(e)
      );
    }

    StateRecoveryValidator.validate(state);

    return {
      result: {
        success: true,
        recovered_version: state.metadata.version,
        applied_diffs: plan.diff_chain.length,
      },
      state,
    };
  }
}
