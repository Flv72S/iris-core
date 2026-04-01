/**
 * 16F.6.B + HARDENING + CLOSURE — Happens-before, concurrency, deterministic resolution, non-destructive merge entrypoints.
 */
import type { DistributedEvent } from './global_input';
import { computeDescendants } from './causal_graph';
import { DistributedInputValidationError } from './errors';
import { compareDistributedEvents } from './event_ordering';

export {
  IRIS_MERGE_RESOLVED_EVENT_TYPE,
  mergeConflictSet,
  mergeConcurrentEvents,
  mergeDeterministicUnion,
  mergeEventSets,
} from './merge_algebra';
export type { DistributedMergePolicy, LegacyMergePolicy, MergePolicy } from './merge_policy';
export type EventRelation = 'BEFORE' | 'AFTER' | 'CONCURRENT' | 'EQUAL';

export { payloadsOverlap } from './payload_domain';

/** True iff neither happens-before relation holds (distinct events). */
export function areConcurrent(
  a: DistributedEvent,
  b: DistributedEvent,
  events: readonly DistributedEvent[],
): boolean {
  return classifyEventRelation(a, b, events) === 'CONCURRENT';
}

export function classifyEventRelationFromDesc(
  a: DistributedEvent,
  b: DistributedEvent,
  descendants: ReadonlyMap<string, ReadonlySet<string>>,
): EventRelation {
  if (a.eventId === b.eventId) return 'EQUAL';
  if (descendants.get(a.eventId)?.has(b.eventId)) return 'BEFORE';
  if (descendants.get(b.eventId)?.has(a.eventId)) return 'AFTER';
  return 'CONCURRENT';
}

export function classifyEventRelation(
  a: DistributedEvent,
  b: DistributedEvent,
  events: readonly DistributedEvent[],
): EventRelation {
  return classifyEventRelationFromDesc(a, b, computeDescendants(events));
}

/**
 * Deterministic winner for audit/replay: causal successor wins; else higher `logicalTime.counter`,
 * then lexicographic `nodeId`, then `eventId` (via {@link compareDistributedEvents}).
 */
export function resolveConcurrentEvents(
  a: DistributedEvent,
  b: DistributedEvent,
  events: readonly DistributedEvent[],
): DistributedEvent {
  const desc = computeDescendants(events);
  if (desc.get(a.eventId)?.has(b.eventId)) return b;
  if (desc.get(b.eventId)?.has(a.eventId)) return a;
  return compareDistributedEvents(a, b) >= 0 ? a : b;
}

/**
 * `a` happens-before `b` iff there is a directed path in the causal graph (same-node sequence + parents).
 */
export function happensBefore(
  a: DistributedEvent,
  b: DistributedEvent,
  events: readonly DistributedEvent[],
): boolean {
  if (a.eventId === b.eventId) return false;
  const desc = computeDescendants(events);
  return desc.get(a.eventId)?.has(b.eventId) ?? false;
}

/**
 * Replay is safe iff for all i < j, not happens-before(events[j], events[i]).
 */
export function assertCausalReplaySafe(events: readonly DistributedEvent[]): void {
  const desc = computeDescendants(events);
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const later = events[j]!;
      const earlier = events[i]!;
      if (desc.get(later.eventId)?.has(earlier.eventId)) {
        throw new DistributedInputValidationError(
          `causal replay violation: ${later.eventId} is causally after ${earlier.eventId} but appears earlier in stream`,
          [`index ${j} vs ${i}`],
        );
      }
    }
  }
}
