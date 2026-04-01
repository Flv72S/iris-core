/**
 * Step 9B — Governance Timeline Index. Query engine.
 */

import type { GovernanceTimeline, GovernanceTimelineEvent } from '../types/governance_timeline_types.js';

/**
 * Events with timestamp <= timestamp (inclusive).
 */
export function getTimelineEventsUntil(
  timeline: GovernanceTimeline,
  timestamp: number
): GovernanceTimelineEvent[] {
  return timeline.events.filter((e) => e.timestamp <= timestamp);
}

/**
 * Events with start <= timestamp <= end (inclusive).
 */
export function getTimelineEventsBetween(
  timeline: GovernanceTimeline,
  start: number,
  end: number
): GovernanceTimelineEvent[] {
  return timeline.events.filter((e) => e.timestamp >= start && e.timestamp <= end);
}

/**
 * Last event with timestamp < timestamp, or null if none.
 */
export function getLastEventBefore(
  timeline: GovernanceTimeline,
  timestamp: number
): GovernanceTimelineEvent | null {
  const before = timeline.events.filter((e) => e.timestamp < timestamp);
  return before.length === 0 ? null : before[before.length - 1] ?? null;
}
