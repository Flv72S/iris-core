/**
 * 16F.6.B.CERTIFICATION — Formal merge operator over event multisets (ADR-003).
 *
 * **Semantics:** `merge : P(Event) → P(Event)` — input is a multiset (order of the array is ignored
 * after canonical deduplication by `eventId`); output is a canonical linear extension under
 * `compareEventsCausally`, with derived `iris.merge.resolved` rows appended for each materialized
 * conflict set. Pure, deterministic, idempotent on canonical id-sets.
 */
import { stableStringify } from '../logging/audit';

import { buildConflictSets, deriveConflictSetId, type ConflictSet } from './conflict_sets';
import { computeDescendants, IRIS_MERGE_RESOLVED_EVENT_TYPE } from './causal_graph';
import { DistributedInputValidationError } from './errors';
import { compareDistributedEvents, compareEventsCausally } from './event_ordering';
import { deriveDeterministicEventId } from './event_identity';
import { canonicalizeDistributedEvent } from './event_serialization';
import { classifyMergePolicyForSet } from './merge_policy';
import { mergeObjectPayloadsGroup } from './payload_domain';

import type { DistributedEvent } from './global_input';
import { normalizeParentEventIds } from './parent_refs';

import { type Event, EventGraph, type EventId, happensBefore, serializeEvent } from './event_model';
import { deterministicCompare } from './state_model';

export { IRIS_MERGE_RESOLVED_EVENT_TYPE } from './causal_graph';

// ---------------------------------------------------------------------------
// 16F.6.C.B.2 — CRDT-grade merge of causal {@link EventGraph}s (Event DAG layer)
// ---------------------------------------------------------------------------

function maxSequenceOnNode(events: readonly DistributedEvent[], nodeId: string): number {
  let m = 0;
  for (const e of events) {
    if (e.nodeId === nodeId) m = Math.max(m, e.sequence);
  }
  return m;
}

function hasMergeForSet(list: readonly DistributedEvent[], eventIds: readonly string[]): boolean {
  const want = [...eventIds].sort((a, b) => a.localeCompare(b)).join('\0');
  for (const e of list) {
    if (e.type !== IRIS_MERGE_RESOLVED_EVENT_TYPE) continue;
    const rf = e.resolvedFrom;
    if (rf === undefined || rf.length !== eventIds.length) continue;
    const got = [...rf].sort((a, b) => a.localeCompare(b)).join('\0');
    if (got === want) return true;
  }
  return false;
}

/** Conflict detection runs only on non-derived rows so merge is associative on primitive multisets. */
function primitiveEventsForConflicts(list: readonly DistributedEvent[]): DistributedEvent[] {
  return list.filter((e) => e.type !== IRIS_MERGE_RESOLVED_EVENT_TYPE);
}

/**
 * Non-destructive merge of a full **conflict set** (≥2 concurrent events with overlapping object payloads).
 * Produces one `iris.merge.resolved` row with `resolvedFrom` = all sources (sorted lexicographically).
 */
export function mergeConflictSet(
  members: DistributedEvent[],
  contextEvents: readonly DistributedEvent[],
  conflictSet: ConflictSet,
): DistributedEvent {
  if (members.length < 2) {
    throw new DistributedInputValidationError('mergeConflictSet requires at least two events');
  }
  const canon = members.map((e) => canonicalizeDistributedEvent(e));
  const sorted = [...canon].sort(compareDistributedEvents);
  const winner = sorted[sorted.length - 1]!;
  const mergePolicy = classifyMergePolicyForSet(canon);

  const parentSet = new Set<string>();
  for (const e of canon) {
    for (const p of normalizeParentEventIds(e)) {
      parentSet.add(p);
    }
  }
  const mergedParents = [...parentSet].sort((a, b) => a.localeCompare(b));

  const payload = mergeObjectPayloadsGroup(canon, compareDistributedEvents);
  const resolvedFrom = sorted.map((e) => e.eventId).sort((a, b) => a.localeCompare(b));

  const nodeId = winner.nodeId;
  const logicalTime = winner.logicalTime;
  const sequence = maxSequenceOnNode(contextEvents, nodeId) + 1;

  const body: Omit<DistributedEvent, 'eventId'> = {
    nodeId,
    logicalTime,
    sequence,
    type: IRIS_MERGE_RESOLVED_EVENT_TYPE,
    payload,
    ...(mergedParents.length > 0 ? { parentEventIds: [...mergedParents] } : {}),
    resolvedFrom,
    mergePolicy,
    conflictSetId: conflictSet.id,
  };

  const merged = { ...body, eventId: deriveDeterministicEventId(body) };
  const cs = conflictSet as ConflictSet & { derivedEventId?: string };
  cs.derivedEventId = merged.eventId;
  return merged;
}

/**
 * Pairwise merge (backward compatible): builds a two-member {@link ConflictSet} and delegates to
 * {@link mergeConflictSet}.
 */
export function mergeConcurrentEvents(
  a: DistributedEvent,
  b: DistributedEvent,
  contextEvents: readonly DistributedEvent[],
): DistributedEvent {
  const ids = [a.eventId, b.eventId].sort((x, y) => x.localeCompare(y));
  const cs: ConflictSet = {
    id: deriveConflictSetId(ids),
    eventIds: Object.freeze([...ids]),
    classification: 'overlap_connected',
  };
  return mergeConflictSet([a, b], contextEvents, cs);
}

/**
 * Single round: conflict sets are built only among **primitive** events (not `iris.merge.resolved`).
 * Emits one derived row per set; avoids merging derived rows into new groups (associative union).
 */
function absorbConflictSets(events: DistributedEvent[]): DistributedEvent[] {
  const list = [...events];
  const descendants = computeDescendants(list);
  const prim = primitiveEventsForConflicts(list);
  const sets = buildConflictSets(prim, descendants);
  const toAdd: DistributedEvent[] = [];
  for (const cs of sets) {
    if (hasMergeForSet(list, cs.eventIds)) continue;
    const members = cs.eventIds
      .map((id) => list.find((e) => e.eventId === id))
      .filter((x): x is DistributedEvent => x !== undefined);
    if (members.length !== cs.eventIds.length) continue;
    toAdd.push(mergeConflictSet(members, list, cs));
  }
  return toAdd.length > 0 ? [...list, ...toAdd] : list;
}

/**
 * Dedupe by `eventId`, union, non-destructive conflict-set merge, causal-then-total sort.
 */
export function mergeDeterministicUnion(
  eventsA: readonly DistributedEvent[],
  eventsB: readonly DistributedEvent[],
): DistributedEvent[] {
  const byId = new Map<string, DistributedEvent>();
  const mergeOne = (e: DistributedEvent): void => {
    const c = canonicalizeDistributedEvent(e);
    const ex = byId.get(c.eventId);
    if (ex !== undefined) {
      if (stableStringify(canonicalizeDistributedEvent(ex)) !== stableStringify(c)) {
        throw new DistributedInputValidationError(`merge conflict for eventId ${c.eventId}`);
      }
      return;
    }
    byId.set(c.eventId, c);
  };
  for (const e of eventsA) mergeOne(e);
  for (const e of eventsB) mergeOne(e);
  return mergeEventSets([...byId.values()]);
}

/**
 * Canonical merge operator: `P(Event) → P(Event)` — input order-independent after id deduplication.
 */
export function mergeEventSets(events: DistributedEvent[]): DistributedEvent[] {
  const byId = new Map<string, DistributedEvent>();
  for (const e of events) {
    const c = canonicalizeDistributedEvent(e);
    const ex = byId.get(c.eventId);
    if (ex !== undefined) {
      if (stableStringify(canonicalizeDistributedEvent(ex)) !== stableStringify(c)) {
        throw new DistributedInputValidationError(`merge conflict for eventId ${c.eventId}`);
      }
      continue;
    }
    byId.set(c.eventId, c);
  }
  let list = [...byId.values()];
  list = absorbConflictSets(list);
  const desc = computeDescendants(list);
  list.sort((a, b) => compareEventsCausally(a, b, desc));
  return list;
}

/** Memoized causal depth: roots `0`, else `max(parent depth) + 1` (DAG, no wall-clock). */
export function computeDepth(eventId: EventId, graph: EventGraph): number {
  const memo = new Map<EventId, number>();
  const rec = (id: EventId): number => {
    if (memo.has(id)) return memo.get(id)!;
    const n = graph.getNode(id);
    if (n === undefined) {
      throw new DistributedInputValidationError(`computeDepth: unknown eventId`, [id]);
    }
    if (n.parents.length === 0) {
      memo.set(id, 0);
      return 0;
    }
    let maxP = -1;
    for (const p of n.parents) {
      maxP = Math.max(maxP, rec(p));
    }
    const d = maxP + 1;
    memo.set(id, d);
    return d;
  };
  return rec(eventId);
}

/** True iff neither event happens-before the other (distinct ids). */
export function areEventDagConcurrent(aId: EventId, bId: EventId, graph: EventGraph): boolean {
  if (aId === bId) return false;
  return !happensBefore(aId, bId, graph) && !happensBefore(bId, aId, graph);
}

/**
 * Total, pure tie-break for concurrent events: deeper chain wins; if equal depth, lexicographically
 * larger {@link Event.id} wins. No timestamps or physical clocks.
 */
export function resolveConflict(a: Event, b: Event, graph: EventGraph): Event {
  if (a.id === b.id) return a;
  const da = computeDepth(a.id, graph);
  const db = computeDepth(b.id, graph);
  if (da !== db) return da > db ? a : b;
  return deterministicCompare(a.id, b.id) >= 0 ? a : b;
}

function computeDepthFromEventMap(eventId: EventId, byId: ReadonlyMap<EventId, Event>, memo: Map<EventId, number>): number {
  if (memo.has(eventId)) return memo.get(eventId)!;
  const e = byId.get(eventId);
  if (e === undefined) {
    throw new DistributedInputValidationError(`mergeGraphs: unknown eventId in depth closure`, [eventId]);
  }
  if (e.parents.length === 0) {
    memo.set(eventId, 0);
    return 0;
  }
  let maxP = -1;
  for (const p of e.parents) {
    if (!byId.has(p)) {
      throw new DistributedInputValidationError(`mergeGraphs: missing parent in union`, [p, `child=${eventId}`]);
    }
    maxP = Math.max(maxP, computeDepthFromEventMap(p, byId, memo));
  }
  const d = maxP + 1;
  memo.set(eventId, d);
  return d;
}

/** Kahn topological order with ready-queue tie-break: deeper node first, then larger `EventId` (matches {@link resolveConflict}). */
export function topologicalSortDepthDominant(graph: EventGraph): EventId[] {
  const ids = graph.ids();
  const indegree = new Map<EventId, number>();
  for (const id of ids) indegree.set(id, 0);
  for (const id of ids) {
    const n = graph.getNode(id)!;
    for (const child of n.children) {
      indegree.set(child, (indegree.get(child) ?? 0) + 1);
    }
  }

  const compareReady = (x: EventId, y: EventId): number => {
    const dx = computeDepth(x, graph);
    const dy = computeDepth(y, graph);
    if (dx !== dy) return dy - dx;
    return deterministicCompare(y, x);
  };

  const ready = ids.filter((id) => (indegree.get(id) ?? 0) === 0).sort(compareReady);
  const out: EventId[] = [];
  while (ready.length > 0) {
    ready.sort(compareReady);
    const id = ready.shift()!;
    out.push(id);
    const n = graph.getNode(id)!;
    for (const child of [...n.children].sort(deterministicCompare)) {
      const next = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, next);
      if (next === 0) ready.push(child);
    }
  }

  if (out.length !== ids.length) {
    throw new DistributedInputValidationError('topologicalSortDepthDominant: cycle in Event DAG');
  }
  return out;
}

function topologicalInsertionOrderFromEventMap(byId: ReadonlyMap<EventId, Event>): EventId[] {
  const ids = [...byId.keys()].sort(deterministicCompare);
  const depthMemo = new Map<EventId, number>();
  const compareReady = (x: EventId, y: EventId): number => {
    const dx = computeDepthFromEventMap(x, byId, depthMemo);
    const dy = computeDepthFromEventMap(y, byId, depthMemo);
    if (dx !== dy) return dy - dx;
    return deterministicCompare(y, x);
  };

  const children = new Map<EventId, EventId[]>();
  for (const id of ids) children.set(id, []);

  const indegree = new Map<EventId, number>();
  for (const id of ids) indegree.set(id, 0);

  for (const id of ids) {
    const e = byId.get(id)!;
    for (const p of e.parents) {
      if (byId.has(p)) {
        indegree.set(id, (indegree.get(id) ?? 0) + 1);
        children.get(p)!.push(id);
      }
    }
  }

  for (const id of ids) {
    children.set(
      id,
      children.get(id)!.sort(deterministicCompare),
    );
  }

  const ready = ids.filter((id) => (indegree.get(id) ?? 0) === 0).sort(compareReady);
  const out: EventId[] = [];
  while (ready.length > 0) {
    ready.sort(compareReady);
    const id = ready.shift()!;
    out.push(id);
    for (const child of children.get(id)!) {
      const next = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, next);
      if (next === 0) ready.push(child);
    }
  }

  if (out.length !== ids.length) {
    throw new DistributedInputValidationError('mergeGraphs: cycle in merged event union');
  }
  return out;
}

/**
 * Bit-stable canonical view of an {@link EventGraph}: sorted `eventId`s, each event serialized with
 * {@link serializeEvent}.
 */
export function serializeEventGraph(graph: EventGraph): string {
  const ids = graph.ids();
  const rows = ids.map((id) => serializeEvent(graph.getNode(id)!.event));
  return stableStringify(rows);
}

function unionEventGraphEvents(a: EventGraph, b: EventGraph): Map<EventId, Event> {
  const byId = new Map<EventId, Event>();
  const ingest = (g: EventGraph): void => {
    for (const id of g.ids()) {
      const ev = g.getNode(id)!.event;
      const ex = byId.get(id);
      if (ex !== undefined) {
        if (serializeEvent(ex) !== serializeEvent(ev)) {
          throw new DistributedInputValidationError(`mergeGraphs: incompatible duplicate eventId`, [id]);
        }
        continue;
      }
      byId.set(id, ev);
    }
  };
  ingest(a);
  ingest(b);
  return byId;
}

/**
 * Deterministic, idempotent, commutative (up to canonical serialization), associative union of two
 * causal DAGs. No events removed; concurrency is reflected only in deterministic ordering via
 * depth-dominant topological semantics ({@link topologicalSortDepthDominant} / {@link resolveConflict}).
 */
export function mergeGraphs(a: EventGraph, b: EventGraph): EventGraph {
  const byId = unionEventGraphEvents(a, b);
  const order = topologicalInsertionOrderFromEventMap(byId);
  const out = new EventGraph();
  for (const id of order) {
    out.addEvent(byId.get(id)!);
  }
  return out;
}
