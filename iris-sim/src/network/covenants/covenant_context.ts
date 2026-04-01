/**
 * Microstep 14L — AI Covenant Monitoring Platform. Evaluation context.
 */

import type { DistributedState } from '../replay/index.js';
import type { ConsensusResult } from '../consensus/index.js';
import type { ConsensusLogEntry } from '../consensus_log/index.js';
import type { ReplayResult } from '../replay/index.js';

export interface CovenantContext {
  readonly current_state: DistributedState;
  readonly previous_state?: DistributedState;
  readonly consensus_result?: ConsensusResult;
  readonly log_entries?: readonly ConsensusLogEntry[];
  readonly replay_result?: ReplayResult;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
