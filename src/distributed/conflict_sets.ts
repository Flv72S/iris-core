/**
 * 16F.6.B.FINAL — Canonical concurrent conflict sets (order-independent, stable).
 * 16F.6.B.CERTIFICATION — Materialized audit entities with deterministic ids.
 */
import crypto from 'node:crypto';

import { stableStringify } from '../logging/audit';

import type { DistributedEvent } from './global_input';
import { payloadsOverlap } from './payload_domain';

export type ConflictSet = {
  /** Deterministic id: `sha256-conflictset-` + hex digest of sorted event ids. */
  id: string;
  readonly eventIds: readonly string[];
  classification: 'overlap_connected';
  /** Set after merge to the derived `iris.merge.resolved` row. */
  derivedEventId?: string;
};

export function deriveConflictSetId(eventIds: readonly string[]): string {
  const sorted = [...eventIds].sort((a, b) => a.localeCompare(b));
  const digest = crypto
    .createHash('sha256')
    .update(stableStringify({ eventIds: sorted }), 'utf8')
    .digest('hex');
  return `sha256-conflictset-${digest}`;
}

function areConcurrentPair(
  a: DistributedEvent,
  b: DistributedEvent,
  descendants: ReadonlyMap<string, ReadonlySet<string>>,
): boolean {
  if (a.eventId === b.eventId) return false;
  if (descendants.get(a.eventId)?.has(b.eventId)) return false;
  if (descendants.get(b.eventId)?.has(a.eventId)) return false;
  return true;
}

/**
 * Non-overlapping conflict groups: **connected components** of the undirected graph
 * where an edge exists iff two events are concurrent and have overlapping **object** payloads.
 * Each set has stable `eventIds`, deterministic `id`, and `classification: 'overlap_connected'`;
 * the array of sets is sorted by first `eventId`.
 */
export function buildConflictSets(
  events: readonly DistributedEvent[],
  descendants: ReadonlyMap<string, ReadonlySet<string>>,
): ConflictSet[] {
  const byId = new Map(events.map((e) => [e.eventId, e] as const));
  const ids = [...byId.keys()].sort((a, b) => a.localeCompare(b));

  const parent = new Map<string, string>();
  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    const p = parent.get(x)!;
    if (p !== x) {
      const r = find(p);
      parent.set(x, r);
    }
    return parent.get(x)!;
  }
  function union(a: string, b: string): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const ei = byId.get(ids[i]!)!;
      const ej = byId.get(ids[j]!)!;
      if (!areConcurrentPair(ei, ej, descendants)) continue;
      if (!payloadsOverlap(ei.payload, ej.payload)) continue;
      union(ids[i]!, ids[j]!);
    }
  }

  const buckets = new Map<string, string[]>();
  for (const id of ids) {
    const r = find(id);
    if (!buckets.has(r)) buckets.set(r, []);
    buckets.get(r)!.push(id);
  }

  const out: ConflictSet[] = [];
  for (const members of buckets.values()) {
    const sorted = [...members].sort((a, b) => a.localeCompare(b));
    if (sorted.length >= 2) {
      const eventIds = Object.freeze([...sorted]);
      out.push({
        id: deriveConflictSetId(eventIds),
        eventIds,
        classification: 'overlap_connected',
      });
    }
  }
  out.sort((a, b) => a.eventIds[0]!.localeCompare(b.eventIds[0]!));
  return out;
}
