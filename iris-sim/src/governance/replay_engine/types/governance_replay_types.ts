/**
 * Step 9A — Governance Replay Engine. Types.
 */

import type { GlobalGovernanceSnapshot } from '../../global_snapshot/types/global_snapshot_types.js';
import type { GovernanceDiffReport } from '../../diff_engine/types/governance_diff_types.js';

export interface GovernanceReplayInput {
  readonly base_snapshot: GlobalGovernanceSnapshot;
  readonly diffs: readonly GovernanceDiffReport[];
}

export interface GovernanceReplayStep {
  readonly applied_diff_hash: string;
  readonly resulting_snapshot_hash: string;
  readonly timestamp: number;
}

export interface GovernanceReplayResult {
  readonly initial_snapshot_hash: string;
  readonly final_snapshot_hash: string;
  readonly steps: readonly GovernanceReplayStep[];
  readonly replay_hash: string;
}
