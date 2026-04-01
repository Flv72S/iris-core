/**
 * Microstep 10H — Governance Trust State Replay Engine. Replay query API.
 */

import type { ReplayResult, ReplayState } from '../types/trust_state_replay_types.js';

/**
 * Get the reconstructed state from a replay result.
 */
export function getReplayState(result: ReplayResult): ReplayState {
  return result.state;
}

/**
 * Get the number of events processed during replay.
 */
export function getProcessedEventCount(result: ReplayResult): number {
  return result.processed_events;
}
