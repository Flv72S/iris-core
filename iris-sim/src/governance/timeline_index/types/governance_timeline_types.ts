/**
 * Step 9B — Governance Timeline Index. Types.
 */

import type { GlobalGovernanceSnapshot } from '../../global_snapshot/types/global_snapshot_types.js';
import type { GovernanceDiffReport } from '../../diff_engine/types/governance_diff_types.js';

export interface GovernanceTimelineInput {
  readonly genesis_snapshot: GlobalGovernanceSnapshot;
  readonly diffs: readonly GovernanceDiffReport[];
}

export interface GovernanceTimelineEvent {
  readonly type: 'snapshot' | 'diff';
  readonly hash: string;
  readonly timestamp: number;
}

export interface GovernanceTimeline {
  readonly genesis_snapshot_hash: string;
  readonly events: readonly GovernanceTimelineEvent[];
  readonly timeline_hash: string;
}
