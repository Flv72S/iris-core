/**
 * 16F.6.A.FORMALIZATION + 16F.6.B — Total order + causal linear extension (ADR-002).
 */
import type { DistributedEvent } from './global_input';
import { compareLogicalTime } from './logical_time';

/**
 * Strict total order:
 * 1. `(logicalTime.counter, logicalTime.nodeId)` via {@link compareLogicalTime}
 * 2. `sequence` (numeric)
 * 3. `eventId` (tie-breaker)
 *
 * Top-level `nodeId` is not a sort key; it must align with `logicalTime.nodeId` (enforced at validation).
 */
export function compareDistributedEvents(a: DistributedEvent, b: DistributedEvent): number {
  const lt = compareLogicalTime(a.logicalTime, b.logicalTime);
  if (lt !== 0) return lt;
  if (a.sequence < b.sequence) return -1;
  if (a.sequence > b.sequence) return 1;
  return a.eventId.localeCompare(b.eventId);
}

/**
 * Total deterministic order: happens-before / happens-after first; concurrent pairs tie-break by
 * `logicalTime` → `sequence` → `eventId` (see {@link compareDistributedEvents}).
 * Preconditions: `descendants` from {@link computeDescendants} on the same event set.
 */
export function compareEventsCausally(
  a: DistributedEvent,
  b: DistributedEvent,
  descendants: ReadonlyMap<string, ReadonlySet<string>>,
): number {
  if (a.eventId === b.eventId) return 0;
  if (descendants.get(a.eventId)?.has(b.eventId)) return -1;
  if (descendants.get(b.eventId)?.has(a.eventId)) return 1;
  return compareDistributedEvents(a, b);
}
