/**
 * Phase 13C — Behavior Monitoring Engine. Append-only event store.
 */

import type { NodeBehaviorEvent } from './node_behavior_types.js';

const event_store: NodeBehaviorEvent[] = [];

/**
 * Record a new behavioral event. Event must be immutable and have valid timestamp.
 */
export function recordBehaviorEvent(event: NodeBehaviorEvent): NodeBehaviorEvent {
  if (!Number.isFinite(event.event_timestamp)) {
    throw new Error('NodeBehaviorEvent: event_timestamp must be a valid number');
  }
  const stored = Object.freeze({ ...event });
  event_store.push(stored);
  return stored;
}

/**
 * Retrieve all events for a node.
 */
export function getEventsByNode(node_id: string): readonly NodeBehaviorEvent[] {
  return event_store.filter((e) => e.node_id === node_id);
}

/**
 * Retrieve events in time range [start_timestamp, end_timestamp] (inclusive).
 */
export function getEventsInTimeRange(
  start_timestamp: number,
  end_timestamp: number
): readonly NodeBehaviorEvent[] {
  return event_store.filter(
    (e) => e.event_timestamp >= start_timestamp && e.event_timestamp <= end_timestamp
  );
}

/**
 * Retrieve all events (for active node enumeration). Read-only.
 */
export function getAllEvents(): readonly NodeBehaviorEvent[] {
  return event_store;
}
