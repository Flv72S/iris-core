/**
 * Step 8H — Governance Time Machine. Historical state reconstruction (read-only).
 */

export type { GovernanceStateAtTime, AttestationResolver } from './types/time_machine_types.js';
export { findClosestSnapshot, getStateAt } from './governance_time_machine.js';
export type { GovernanceReplayEvent } from './governance_replay_engine.js';
export { replayFromSnapshot } from './governance_replay_engine.js';
export { getHistory, getEventsByType, getEventsByActor } from './governance_history_query.js';
