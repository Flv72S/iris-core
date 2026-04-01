/**
 * Step 9A — Governance Replay Engine. Verifier.
 */

import type { GovernanceReplayInput, GovernanceReplayResult } from '../types/governance_replay_types.js';
import { replayGovernanceHistory } from '../engine/governance_replay_engine.js';

/**
 * Verify a replay result by re-running the replay and comparing hashes and steps.
 */
export function verifyGovernanceReplay(
  input: GovernanceReplayInput,
  result: GovernanceReplayResult
): boolean {
  try {
    const expected = replayGovernanceHistory(input);
    return (
      result.initial_snapshot_hash === expected.initial_snapshot_hash &&
      result.final_snapshot_hash === expected.final_snapshot_hash &&
      result.replay_hash === expected.replay_hash &&
      result.steps.length === expected.steps.length &&
      result.steps.every(
        (s, i) =>
          s.applied_diff_hash === expected.steps[i]!.applied_diff_hash &&
          s.resulting_snapshot_hash === expected.steps[i]!.resulting_snapshot_hash &&
          s.timestamp === expected.steps[i]!.timestamp
      )
    );
  } catch {
    return false;
  }
}
