/**
 * Step 9A — Governance Replay Engine. Deterministic replay of governance history.
 */

import { createHash } from 'node:crypto';
import type { GovernanceReplayInput, GovernanceReplayResult, GovernanceReplayStep } from '../types/governance_replay_types.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Replay governance history: verify diff chain from base snapshot and produce a deterministic result.
 * Does not mutate any input. Throws if diff chain is inconsistent.
 */
export function replayGovernanceHistory(input: GovernanceReplayInput): GovernanceReplayResult {
  const base_snapshot = input.base_snapshot;
  const diffs = input.diffs;

  const initial_snapshot_hash = base_snapshot.global_hash;
  let current_hash = initial_snapshot_hash;
  const steps: GovernanceReplayStep[] = [];

  for (let i = 0; i < diffs.length; i++) {
    const diff = diffs[i]!;
    if (diff.snapshot_A_hash !== current_hash) {
      throw new Error(
        `GovernanceReplay: diff chain broken at index ${i}: expected snapshot_A_hash ${current_hash}, got ${diff.snapshot_A_hash}`
      );
    }
    steps.push(
      Object.freeze({
        applied_diff_hash: diff.diff_hash,
        resulting_snapshot_hash: diff.snapshot_B_hash,
        timestamp: diff.timestamp,
      })
    );
    current_hash = diff.snapshot_B_hash;
  }

  const final_snapshot_hash = current_hash;
  const diff_hashes_concatenated = diffs.map((d) => d.diff_hash).join('');
  const replay_hash = sha256Hex(
    initial_snapshot_hash + final_snapshot_hash + diff_hashes_concatenated
  );

  return Object.freeze({
    initial_snapshot_hash,
    final_snapshot_hash,
    steps: Object.freeze(steps),
    replay_hash,
  });
}
