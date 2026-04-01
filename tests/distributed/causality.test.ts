import { describe, expect, it } from 'vitest';

import {
  assertCausalReplaySafe,
  classifyEventRelation,
  happensBefore,
  resolveConcurrentEvents,
} from '../../src/distributed/causality';
import { stableStringify } from '../../src/logging/audit';
import {
  buildCausalGraph,
  computeDescendants,
} from '../../src/distributed/causal_graph';
import { buildConflictSets, deriveConflictSetId } from '../../src/distributed/conflict_sets';
import {
  IRIS_MERGE_RESOLVED_EVENT_TYPE,
  mergeConcurrentEvents,
  mergeConflictSet,
  mergeDeterministicUnion,
  mergeEventSets,
} from '../../src/distributed/merge_algebra';
import { areEventSetsCanonicallyEqual } from '../../src/distributed/event_equality';
import { canonicalizeDistributedEvent } from '../../src/distributed/event_serialization';
import { compareEventsCausally } from '../../src/distributed/event_ordering';
import { getEventAncestors, getEventDescendants } from '../../src/distributed/event_traceability';
import { deriveDeterministicEventId } from '../../src/distributed/event_identity';
import { mergeEventStreams } from '../../src/distributed/logical_clock';
import { advanceLocalClock, mergeClocks } from '../../src/distributed/logical_time';
import { classifyMergePolicyForSet } from '../../src/distributed/merge_policy';
import type { DistributedEvent } from '../../src/distributed/global_input';

function permuteDeterministic<T>(arr: readonly T[], seed: number): T[] {
  const out = [...arr];
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    const t = out[i]!;
    out[i] = out[j]!;
    out[j] = t;
  }
  return out;
}

function lt(counter: number, nodeId: string) {
  return { counter, nodeId };
}

function ev(omitId: Omit<DistributedEvent, 'eventId'>): DistributedEvent {
  const id = deriveDeterministicEventId(omitId);
  return { ...omitId, eventId: id };
}

describe('16F.6.B causality', () => {
  it('advanceLocalClock and mergeClocks are deterministic', () => {
    const a = lt(3, 'n1');
    expect(advanceLocalClock(a)).toEqual({ counter: 4, nodeId: 'n1' });
    expect(mergeClocks(lt(2, 'n1'), lt(5, 'n2'))).toEqual({ counter: 6, nodeId: 'n1' });
  });

  it('happensBefore: same-node sequence and parent edge', () => {
    const a = ev({ nodeId: 'n1', logicalTime: lt(1, 'n1'), sequence: 1, type: 'A', payload: {} });
    const b = ev({ nodeId: 'n1', logicalTime: lt(2, 'n1'), sequence: 2, type: 'B', payload: {} });
    const c = ev({
      nodeId: 'n1',
      logicalTime: lt(3, 'n1'),
      sequence: 3,
      type: 'C',
      payload: {},
      parentEventId: a.eventId,
    });
    const events = [a, b, c];
    expect(happensBefore(a, b, events)).toBe(true);
    expect(happensBefore(a, c, events)).toBe(true);
    expect(happensBefore(b, c, events)).toBe(true);
    expect(happensBefore(c, a, events)).toBe(false);
  });

  it('buildCausalGraph is deterministic across runs', () => {
    const pool = [
      ev({ nodeId: 'z', logicalTime: lt(1, 'z'), sequence: 1, type: 'T', payload: {} }),
      ev({ nodeId: 'a', logicalTime: lt(1, 'a'), sequence: 1, type: 'T', payload: {} }),
    ];
    const g1 = buildCausalGraph(pool);
    const g2 = buildCausalGraph([pool[1]!, pool[0]!]);
    expect([...g1.nodes.keys()].sort()).toEqual([...g2.nodes.keys()].sort());
  });

  it('mergeEventStreams is commutative', () => {
    const x = ev({ nodeId: 'n1', logicalTime: lt(1, 'n1'), sequence: 1, type: 'X', payload: {} });
    const y = ev({ nodeId: 'n2', logicalTime: lt(1, 'n2'), sequence: 1, type: 'Y', payload: {} });
    const m1 = mergeEventStreams([x], [y]);
    const m2 = mergeEventStreams([y], [x]);
    expect(m1.events.map((e) => e.eventId)).toEqual(m2.events.map((e) => e.eventId));
  });

  it('merge preserves causal chain', () => {
    const root = ev({ nodeId: 'n1', logicalTime: lt(1, 'n1'), sequence: 1, type: 'R', payload: {} });
    const child = ev({
      nodeId: 'n1',
      logicalTime: lt(2, 'n1'),
      sequence: 2,
      type: 'C',
      payload: {},
      parentEventId: root.eventId,
    });
    const m = mergeEventStreams([root], [child]);
    expect(happensBefore(root, child, m.events)).toBe(true);
    const idx = new Map(m.events.map((e, i) => [e.eventId, i]));
    expect(idx.get(root.eventId)! < idx.get(child.eventId)!).toBe(true);
  });

  it('getEventAncestors and getEventDescendants are sorted and consistent', () => {
    const a = ev({ nodeId: 'n1', logicalTime: lt(1, 'n1'), sequence: 1, type: 'A', payload: {} });
    const b = ev({
      nodeId: 'n1',
      logicalTime: lt(2, 'n1'),
      sequence: 2,
      type: 'B',
      payload: {},
      parentEventId: a.eventId,
    });
    const events = [a, b];
    expect(getEventAncestors(b.eventId, events)).toContain(a.eventId);
    const desc = getEventDescendants(a.eventId, events);
    expect(desc).toContain(b.eventId);
  });

  it('assertCausalReplaySafe rejects wrong order', () => {
    const a = ev({ nodeId: 'n1', logicalTime: lt(1, 'n1'), sequence: 1, type: 'A', payload: {} });
    const b = ev({
      nodeId: 'n1',
      logicalTime: lt(2, 'n1'),
      sequence: 2,
      type: 'B',
      payload: {},
      parentEventId: a.eventId,
    });
    expect(() => assertCausalReplaySafe([b, a])).toThrow(/causal replay violation/);
  });

  it('property: causal compare sort is stable over permutations', () => {
    const pool = [
      ev({ nodeId: 'n1', logicalTime: lt(1, 'n1'), sequence: 1, type: 'a', payload: {} }),
      ev({ nodeId: 'n1', logicalTime: lt(1, 'n1'), sequence: 2, type: 'b', payload: {} }),
      ev({ nodeId: 'n2', logicalTime: lt(1, 'n2'), sequence: 1, type: 'c', payload: {} }),
    ];
    const desc = computeDescendants(pool);
    const canonical = [...pool].sort((a, b) => compareEventsCausally(a, b, desc));
    for (let k = 0; k < 52; k++) {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const d2 = computeDescendants(shuffled);
      const sorted = [...shuffled].sort((a, b) => compareEventsCausally(a, b, d2));
      expect(sorted.map((e) => e.eventId)).toEqual(canonical.map((e) => e.eventId));
    }
  });

  it('multi-parent fan-in: ancestors include both parents (sorted)', () => {
    const p1 = ev({ nodeId: 'n1', logicalTime: lt(1, 'n1'), sequence: 1, type: 'P1', payload: {} });
    const p2 = ev({ nodeId: 'n2', logicalTime: lt(1, 'n2'), sequence: 1, type: 'P2', payload: {} });
    const child = ev({
      nodeId: 'n3',
      logicalTime: lt(1, 'n3'),
      sequence: 1,
      type: 'C',
      payload: {},
      parentEventIds: [p1.eventId, p2.eventId].sort((a, b) => a.localeCompare(b)),
    });
    const events = [p1, p2, child];
    expect(happensBefore(p1, child, events)).toBe(true);
    expect(happensBefore(p2, child, events)).toBe(true);
    const anc = getEventAncestors(child.eventId, events);
    expect(anc).toEqual([p1.eventId, p2.eventId].sort((a, b) => a.localeCompare(b)));
  });

  it('classifyEventRelation is symmetric for BEFORE/AFTER', () => {
    const a = ev({ nodeId: 'n1', logicalTime: lt(1, 'n1'), sequence: 1, type: 'A', payload: {} });
    const b = ev({
      nodeId: 'n1',
      logicalTime: lt(2, 'n1'),
      sequence: 2,
      type: 'B',
      payload: {},
      parentEventId: a.eventId,
    });
    const events = [a, b];
    expect(classifyEventRelation(a, b, events)).toBe('BEFORE');
    expect(classifyEventRelation(b, a, events)).toBe('AFTER');
  });

  it('buildConflictSets is stable across permutations (100) for primitive events', () => {
    const pool = [
      ev({ nodeId: 'a', logicalTime: lt(2, 'a'), sequence: 1, type: 'T', payload: { k: 0 } }),
      ev({ nodeId: 'b', logicalTime: lt(2, 'b'), sequence: 1, type: 'T', payload: { k: 1 } }),
      ev({ nodeId: 'c', logicalTime: lt(2, 'c'), sequence: 1, type: 'T', payload: { k: 2 } }),
    ];
    const ref = stableStringify(buildConflictSets(pool, computeDescendants(pool)));
    for (let i = 0; i < 100; i++) {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const got = stableStringify(buildConflictSets(shuffled, computeDescendants(shuffled)));
      expect(got).toBe(ref);
    }
  });

  it('mergeConflictSet merges a large concurrent overlap clique (4 sources)', () => {
    const e = [
      ev({ nodeId: 'n1', logicalTime: lt(4, 'n1'), sequence: 1, type: 'E', payload: { domain: 1 } }),
      ev({ nodeId: 'n2', logicalTime: lt(3, 'n2'), sequence: 1, type: 'E', payload: { domain: 2 } }),
      ev({ nodeId: 'n3', logicalTime: lt(2, 'n3'), sequence: 1, type: 'E', payload: { domain: 3 } }),
      ev({ nodeId: 'n4', logicalTime: lt(1, 'n4'), sequence: 1, type: 'E', payload: { domain: 4 } }),
    ];
    const desc = computeDescendants(e);
    const sets = buildConflictSets(e, desc);
    expect(sets.length).toBe(1);
    const cs = sets[0]!;
    const members = cs.eventIds.map((id) => e.find((x) => x.eventId === id)!);
    const m = mergeConflictSet(members, e, cs);
    expect(m.resolvedFrom).toHaveLength(4);
    expect(m.type).toBe(IRIS_MERGE_RESOLVED_EVENT_TYPE);
    expect(m.conflictSetId).toBe(cs.id);
    expect(cs.derivedEventId).toBe(m.eventId);
  });

  it('mergeDeterministicUnion: ≥100 permutations yield identical canonical multiset', () => {
    const pool = [
      ev({ nodeId: 'a', logicalTime: lt(2, 'a'), sequence: 1, type: 'T', payload: { i: 0 } }),
      ev({ nodeId: 'b', logicalTime: lt(3, 'b'), sequence: 1, type: 'T', payload: { j: 1 } }),
      ev({ nodeId: 'c', logicalTime: lt(1, 'c'), sequence: 1, type: 'T', payload: { k: 2 } }),
    ];
    const ref = stableStringify(mergeDeterministicUnion(pool, []).map((x) => canonicalizeDistributedEvent(x)));
    for (let i = 0; i < 100; i++) {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const got = stableStringify(mergeDeterministicUnion(shuffled, []).map((x) => canonicalizeDistributedEvent(x)));
      expect(got).toBe(ref);
    }
  });

  it('nested merge rounds: second union merges new stream with prior merged output', () => {
    const x = ev({
      nodeId: 'n1',
      logicalTime: lt(5, 'n1'),
      sequence: 1,
      type: 'X',
      payload: { domain: 1 },
    });
    const y = ev({
      nodeId: 'n2',
      logicalTime: lt(3, 'n2'),
      sequence: 1,
      type: 'Y',
      payload: { domain: 2 },
    });
    const z = ev({
      nodeId: 'n3',
      logicalTime: lt(1, 'n3'),
      sequence: 1,
      type: 'Z',
      payload: { domain: 3 },
    });
    const first = mergeDeterministicUnion([x], [y]);
    const second = mergeDeterministicUnion(first, [z]);
    expect(second.length).toBeGreaterThanOrEqual(first.length);
    const ids = new Set(second.map((e) => e.eventId));
    expect(ids.has(x.eventId)).toBe(true);
    expect(ids.has(y.eventId)).toBe(true);
    expect(ids.has(z.eventId)).toBe(true);
  });

  it('mergeDeterministicUnion keeps sources and appends derived merge when payloads overlap', () => {
    const x = ev({
      nodeId: 'n1',
      logicalTime: lt(5, 'n1'),
      sequence: 1,
      type: 'X',
      payload: { domain: 1 },
    });
    const y = ev({
      nodeId: 'n2',
      logicalTime: lt(3, 'n2'),
      sequence: 1,
      type: 'Y',
      payload: { domain: 2 },
    });
    const merged = mergeDeterministicUnion([x], [y]);
    expect(merged).toHaveLength(3);
    const ids = new Set(merged.map((e) => e.eventId));
    expect(ids.has(x.eventId)).toBe(true);
    expect(ids.has(y.eventId)).toBe(true);
    const derived = merged.find((e) => e.type === IRIS_MERGE_RESOLVED_EVENT_TYPE);
    expect(derived).toBeDefined();
    expect(derived!.resolvedFrom).toEqual([x.eventId, y.eventId].sort((a, b) => a.localeCompare(b)));
    expect(derived!.mergePolicy).toBeDefined();
    expect(derived!.conflictSetId).toBe(deriveConflictSetId(derived!.resolvedFrom!));
    const idxX = merged.findIndex((e) => e.eventId === x.eventId);
    const idxY = merged.findIndex((e) => e.eventId === y.eventId);
    const idxD = merged.findIndex((e) => e.eventId === derived!.eventId);
    expect(idxD).toBeGreaterThan(idxX);
    expect(idxD).toBeGreaterThan(idxY);
  });

  it('mergeConcurrentEvents merges payloads and sets deterministic policy', () => {
    const x = ev({
      nodeId: 'n1',
      logicalTime: lt(5, 'n1'),
      sequence: 1,
      type: 'X',
      payload: { domain: 1, onlyX: true },
    });
    const y = ev({
      nodeId: 'n2',
      logicalTime: lt(3, 'n2'),
      sequence: 1,
      type: 'Y',
      payload: { domain: 2, onlyY: true },
    });
    const ctx = [x, y];
    const m = mergeConcurrentEvents(x, y, ctx);
    expect(m.resolvedFrom).toEqual([x.eventId, y.eventId].sort((a, b) => a.localeCompare(b)));
    expect(m.mergePolicy).toMatchObject({
      type: 'deterministic_order',
      winner: x.eventId,
    });
    expect(m.conflictSetId).toBe(deriveConflictSetId([x.eventId, y.eventId]));
    expect(m.type).toBe(IRIS_MERGE_RESOLVED_EVENT_TYPE);
    const p = m.payload as Record<string, unknown>;
    expect(p.domain).toBe(1);
    expect(p.onlyX).toBe(true);
    expect(p.onlyY).toBe(true);
  });

  it('resolveConcurrentEvents is deterministic for concurrent overlapping payloads', () => {
    const x = ev({
      nodeId: 'n1',
      logicalTime: lt(5, 'n1'),
      sequence: 1,
      type: 'X',
      payload: { domain: 1 },
    });
    const y = ev({
      nodeId: 'n2',
      logicalTime: lt(3, 'n2'),
      sequence: 1,
      type: 'Y',
      payload: { domain: 2 },
    });
    const events = [x, y];
    const w1 = resolveConcurrentEvents(x, y, events);
    const w2 = resolveConcurrentEvents(x, y, events);
    expect(w1.eventId).toBe(w2.eventId);
    expect(w1.eventId).toBe(x.eventId);
  });

  it('mergeDeterministicUnion is associative when derived merges are not triggered', () => {
    const a = ev({ nodeId: 'a', logicalTime: lt(1, 'a'), sequence: 1, type: 'T', payload: { x: 1 } });
    const b = ev({ nodeId: 'b', logicalTime: lt(1, 'b'), sequence: 1, type: 'T', payload: { y: 1 } });
    const c = ev({ nodeId: 'c', logicalTime: lt(1, 'c'), sequence: 1, type: 'T', payload: { z: 1 } });
    const m1 = mergeDeterministicUnion(mergeDeterministicUnion([a], [b]), [c]);
    const m2 = mergeDeterministicUnion([a], mergeDeterministicUnion([b], [c]));
    expect(m1.map((e) => e.eventId)).toEqual(m2.map((e) => e.eventId));
  });

  it('mergeDeterministicUnion: commutativity and idempotency under shuffles (≥50)', () => {
    const pool = [
      ev({ nodeId: 'a', logicalTime: lt(2, 'a'), sequence: 1, type: 'T', payload: { i: 0 } }),
      ev({ nodeId: 'b', logicalTime: lt(3, 'b'), sequence: 1, type: 'T', payload: { j: 1 } }),
      ev({ nodeId: 'c', logicalTime: lt(1, 'c'), sequence: 1, type: 'T', payload: { k: 2 } }),
    ];
    const ref = mergeDeterministicUnion(pool, []);
    for (let i = 0; i < 55; i++) {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const mid = Math.floor(shuffled.length / 2) || 1;
      const left = shuffled.slice(0, mid);
      const right = shuffled.slice(mid);
      const m = mergeDeterministicUnion(left, right);
      expect(m.map((e) => e.eventId)).toEqual(ref.map((e) => e.eventId));
      expect(mergeDeterministicUnion(m, []).map((e) => e.eventId)).toEqual(ref.map((e) => e.eventId));
    }
  });

  it('compareEventsCausally defines a total preorder consistent on a 3-event mixed chain', () => {
    const a = ev({ nodeId: 'n1', logicalTime: lt(1, 'n1'), sequence: 1, type: 'A', payload: {} });
    const b = ev({ nodeId: 'n2', logicalTime: lt(1, 'n2'), sequence: 1, type: 'B', payload: {} });
    const c = ev({
      nodeId: 'n1',
      logicalTime: lt(2, 'n1'),
      sequence: 2,
      type: 'C',
      payload: {},
      parentEventIds: [a.eventId],
    });
    const events = [a, b, c];
    const desc = computeDescendants(events);
    expect(compareEventsCausally(a, c, desc)).toBeLessThan(0);
    expect(compareEventsCausally(b, c, desc)).toBeLessThan(0);
    const cmpAB = compareEventsCausally(a, b, desc);
    const cmpBC = compareEventsCausally(b, c, desc);
    const cmpAC = compareEventsCausally(a, c, desc);
    if (cmpAB < 0 && cmpBC < 0) expect(cmpAC).toBeLessThan(0);
  });

  it('deriveConflictSetId is deterministic across permutations of event ids', () => {
    const id1 = deriveConflictSetId(['b', 'a', 'c']);
    const id2 = deriveConflictSetId(['c', 'b', 'a']);
    expect(id1).toBe(id2);
    expect(id1.startsWith('sha256-conflictset-')).toBe(true);
  });

  it('MergePolicy: same member set yields identical policy (order-independent)', () => {
    const x = ev({ nodeId: 'n1', logicalTime: lt(5, 'n1'), sequence: 1, type: 'X', payload: { domain: 1 } });
    const y = ev({ nodeId: 'n2', logicalTime: lt(3, 'n2'), sequence: 1, type: 'Y', payload: { domain: 2 } });
    const p1 = classifyMergePolicyForSet([x, y]);
    const p2 = classifyMergePolicyForSet([y, x]);
    expect(p1).toEqual(p2);
    expect(p1.participants).toEqual([x.eventId, y.eventId].sort((a, b) => a.localeCompare(b)));
  });

  it('mergeEventSets: formal associativity on three primitives', () => {
    const pool = [
      ev({ nodeId: 'a', logicalTime: lt(2, 'a'), sequence: 1, type: 'T', payload: { i: 0 } }),
      ev({ nodeId: 'b', logicalTime: lt(3, 'b'), sequence: 1, type: 'T', payload: { j: 1 } }),
      ev({ nodeId: 'c', logicalTime: lt(1, 'c'), sequence: 1, type: 'T', payload: { k: 2 } }),
    ];
    const u1 = mergeEventSets([...pool]);
    const u2 = mergeEventSets([...mergeEventSets([pool[0]!, pool[1]!]), pool[2]!]);
    expect(areEventSetsCanonicallyEqual(u1, u2)).toBe(true);
  });

  it('mergeEventSets: commutativity and idempotency', () => {
    const pool = [
      ev({ nodeId: 'a', logicalTime: lt(2, 'a'), sequence: 1, type: 'T', payload: { i: 0 } }),
      ev({ nodeId: 'b', logicalTime: lt(3, 'b'), sequence: 1, type: 'T', payload: { j: 1 } }),
    ];
    const u1 = mergeEventSets([...pool]);
    const u2 = mergeEventSets([pool[1]!, pool[0]!]);
    expect(areEventSetsCanonicallyEqual(u1, u2)).toBe(true);
    expect(areEventSetsCanonicallyEqual(mergeEventSets([...pool, ...pool]), u1)).toBe(true);
  });

  it('mergeEventSets output matches under deterministic shuffles of input', () => {
    const pool = [
      ev({ nodeId: 'a', logicalTime: lt(2, 'a'), sequence: 1, type: 'T', payload: { i: 0 } }),
      ev({ nodeId: 'b', logicalTime: lt(3, 'b'), sequence: 1, type: 'T', payload: { j: 1 } }),
      ev({ nodeId: 'c', logicalTime: lt(1, 'c'), sequence: 1, type: 'T', payload: { k: 2 } }),
    ];
    const ref = mergeEventSets(pool);
    for (let seed = 0; seed < 55; seed++) {
      const shuffled = permuteDeterministic(pool, seed + 41);
      expect(areEventSetsCanonicallyEqual(ref, mergeEventSets(shuffled))).toBe(true);
    }
  });

  it('traceability: derived event links conflictSetId and reverse derivedEventId on ConflictSet', () => {
    const e = [
      ev({ nodeId: 'n1', logicalTime: lt(4, 'n1'), sequence: 1, type: 'E', payload: { domain: 1 } }),
      ev({ nodeId: 'n2', logicalTime: lt(3, 'n2'), sequence: 1, type: 'E', payload: { domain: 2 } }),
    ];
    const desc = computeDescendants(e);
    const sets = buildConflictSets(e, desc);
    const cs = sets[0]!;
    const members = cs.eventIds.map((id) => e.find((x) => x.eventId === id)!);
    const m = mergeConflictSet(members, e, cs);
    expect(m.conflictSetId).toBe(cs.id);
    expect(cs.derivedEventId).toBe(m.eventId);
  });
});
