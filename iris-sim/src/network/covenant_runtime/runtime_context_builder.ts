/**
 * Microstep 14M — Covenant Runtime & Event Engine. Context builder.
 */

import type { ConsensusResult } from '../consensus/index.js';
import type { CovenantContext } from '../covenants/index.js';
import type { CovenantEvent } from './runtime_types.js';
import type { DistributedState } from '../replay/index.js';
import type { ConsensusLogEntry } from '../consensus_log/index.js';
import type { ReplayResult } from '../replay/index.js';

export interface RuntimeContextBuilderDeps {
  getState: () => DistributedState;
  getPreviousState?: () => DistributedState;
  getLog: () => readonly ConsensusLogEntry[];
  replay: () => ReplayResult;
}

export class RuntimeContextBuilder {
  static build(
    event: CovenantEvent,
    deps: RuntimeContextBuilderDeps,
  ): CovenantContext {
    const current_state = deps.getState();
    const previous_state = deps.getPreviousState?.();
    const log_entries = deps.getLog();
    const replay_result = deps.replay();

    let consensus_result: ConsensusResult | undefined;
    if (event.type === 'CONSENSUS_COMPLETED' && event.payload != null) {
      const p = event.payload as ConsensusResult;
      if (
        typeof p.proposal_id === 'string' &&
        typeof p.accepted === 'boolean' &&
        typeof p.quorum_reached === 'boolean' &&
        typeof p.total_votes === 'number'
      ) {
        consensus_result = p;
      }
    }

    return Object.freeze({
      current_state,
      ...(previous_state !== undefined ? { previous_state } : {}),
      ...(consensus_result !== undefined ? { consensus_result } : {}),
      log_entries,
      replay_result,
      metadata: Object.freeze({
        eventType: event.type,
        timestamp: event.timestamp,
      }),
    });
  }
}
