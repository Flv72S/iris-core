/**
 * Microstep 10H — Governance Trust State Replay Engine. Event stream reader.
 */

import type { TrustEventLog, TrustEvent } from '../../trust_event_log/types/trust_event_types.js';

/**
 * Read event stream from log in chronological order (deterministic).
 */
export function readEventStream(log: TrustEventLog): TrustEvent[] {
  return [...log.events];
}
