/**
 * Microstep 10G — Governance Trust Event Log Engine. Event log query.
 */

import type { TrustEventLog, TrustEvent, TrustEventType } from '../types/trust_event_types.js';

/**
 * Get all events of a given type, in chronological order.
 */
export function getEventsByType(log: TrustEventLog, type: TrustEventType): TrustEvent[] {
  return log.events.filter((e) => e.type === type);
}

/**
 * Get events within a time range [start, end] (inclusive).
 */
export function getEventsByTimeRange(
  log: TrustEventLog,
  start: number,
  end: number
): TrustEvent[] {
  return log.events.filter((e) => e.timestamp >= start && e.timestamp <= end);
}

/**
 * Get the last event in the log, or null if empty.
 */
export function getLastEvent(log: TrustEventLog): TrustEvent | null {
  if (log.events.length === 0) return null;
  return log.events[log.events.length - 1];
}
