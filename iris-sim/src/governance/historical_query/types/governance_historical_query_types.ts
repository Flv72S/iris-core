/**
 * Step 9C — Governance Historical Query Engine. Types.
 */

import type { GlobalGovernanceSnapshot } from '../../global_snapshot/types/global_snapshot_types.js';
import type { GovernanceDiffReport } from '../../diff_engine/types/governance_diff_types.js';
import type { GovernanceTimeline } from '../../timeline_index/types/governance_timeline_types.js';

export interface GovernanceHistoricalQueryInput {
  readonly genesis_snapshot: GlobalGovernanceSnapshot;
  /** Timeline built from genesis_snapshot and diffs (STEP 9B). */
  readonly timeline: GovernanceTimeline;
  /** Ordered list of diffs used to build the timeline (same order as in buildGovernanceTimeline). */
  readonly diffs: readonly GovernanceDiffReport[];
  readonly timestamp: number;
}

export interface GovernanceHistoricalQueryResult {
  readonly query_timestamp: number;
  readonly snapshot_hash_at_time: string;
  readonly reconstructed_snapshot_hash: string;
  readonly applied_diffs: readonly string[];
  readonly query_hash: string;
}
