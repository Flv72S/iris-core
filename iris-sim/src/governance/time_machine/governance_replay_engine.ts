/**
 * Step 8H — Governance Replay Engine. Deterministic state reconstruction from snapshot (read-only).
 */

import type { GovernanceLedgerEntry } from '../ledger/types/ledger_types.js';
import type { GovernanceStateAtTime } from './types/time_machine_types.js';

/** Minimal event type for future replay (no OperationEnvelope in codebase). */
export interface GovernanceReplayEvent {
  readonly timestamp: number;
  readonly type: string;
  readonly payload?: unknown;
}

/**
 * Rebuild state from snapshot entry. With no OperationEnvelope events, state = snapshot.
 * Replay is deterministic: apply events in order; when events are empty, return snapshot state.
 */
export function replayFromSnapshot(
  snapshotEntry: GovernanceLedgerEntry,
  eventsAfterSnapshot: readonly GovernanceReplayEvent[]
): GovernanceStateAtTime {
  const state: GovernanceStateAtTime = Object.freeze({
    timestamp: snapshotEntry.timestamp,
    entry: snapshotEntry,
  });
  if (eventsAfterSnapshot.length === 0) {
    return state;
  }
  const lastEvent = eventsAfterSnapshot[eventsAfterSnapshot.length - 1];
  return Object.freeze({
    timestamp: lastEvent!.timestamp,
    entry: snapshotEntry,
  });
}
