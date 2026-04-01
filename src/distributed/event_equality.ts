/**
 * 16F.6.A.PATCH — Canonical equality for DistributedEvent (stableStringify of canonical form only).
 */
import { stableStringify } from '../logging/audit';

import type { DistributedEvent } from './global_input';
import { DistributedInputValidationError } from './errors';
import { canonicalizeDistributedEvent } from './event_serialization';

export function areDistributedEventsCanonicallyEqual(a: DistributedEvent, b: DistributedEvent): boolean {
  return stableStringify(canonicalizeDistributedEvent(a)) === stableStringify(canonicalizeDistributedEvent(b));
}

/** Multiset equality: canonicalize each event, sort by `eventId`, compare `stableStringify`. */
export function areEventSetsCanonicallyEqual(a: readonly DistributedEvent[], b: readonly DistributedEvent[]): boolean {
  const canonA = [...a]
    .map((e) => canonicalizeDistributedEvent(e))
    .sort((x, y) => x.eventId.localeCompare(y.eventId));
  const canonB = [...b]
    .map((e) => canonicalizeDistributedEvent(e))
    .sort((x, y) => x.eventId.localeCompare(y.eventId));
  if (canonA.length !== canonB.length) return false;
  return stableStringify(canonA) === stableStringify(canonB);
}

export function assertDistributedEventsCanonicallyEqual(a: DistributedEvent, b: DistributedEvent): void {
  const sa = stableStringify(canonicalizeDistributedEvent(a));
  const sb = stableStringify(canonicalizeDistributedEvent(b));
  if (sa !== sb) {
    const hint =
      sa.length <= 200 && sb.length <= 200
        ? `stableStringify mismatch: ${sa} vs ${sb}`
        : `stableStringify mismatch (lengths ${sa.length} vs ${sb.length})`;
    throw new DistributedInputValidationError(
      `distributed events not canonically equal (a.eventId=${a.eventId}, b.eventId=${b.eventId})`,
      [hint],
    );
  }
}
