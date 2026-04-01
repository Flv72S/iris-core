import { describe, expect, it } from 'vitest';

import { certifyGlobalInput } from '../../src/distributed/global_input_certification';
import { deriveDeterministicEventId } from '../../src/distributed/event_identity';
import { compareDistributedEvents } from '../../src/distributed/event_ordering';
import {
  canonicalizeDistributedEvent,
  hashDistributedEvent,
  serializeDistributedEvent,
} from '../../src/distributed/event_serialization';
import {
  areDistributedEventsCanonicallyEqual,
  assertDistributedEventsCanonicallyEqual,
} from '../../src/distributed/event_equality';
import {
  assertLogicalTimeMonotonicPerNode,
  DistributedInputValidationError,
  validateCausalConsistency,
  validateDistributedEvent,
  validateNormalizedGlobalInputWithResult,
} from '../../src/distributed/event_validation';
import {
  hashGlobalInput,
  normalizeGlobalInput,
  type DistributedEvent,
  type GlobalInput,
  type NormalizedGlobalInput,
} from '../../src/distributed/global_input';
import { compareLogicalTime, serializeLogicalTime } from '../../src/distributed/logical_time';
import type { LogicalTime } from '../../src/distributed/logical_time';
import { CAUSAL_INVARIANT_DECLARATIONS } from '../../src/distributed/causal_invariants';
import { validateEventTraceability } from '../../src/distributed/event_traceability';
import { DISTRIBUTED_INVARIANT_DECLARATIONS } from '../../src/distributed/invariants';
import { stableStringify } from '../../src/logging/audit';
import {
  canonicalizeEvent,
  createEvent,
  EventGraph,
  happensBefore,
  topologicalSort,
} from '../../src/distributed/event_model';

function lt(counter: number, nodeId: string): LogicalTime {
  return { counter, nodeId };
}

function ev(omitId: Omit<DistributedEvent, 'eventId'>): DistributedEvent {
  const id = deriveDeterministicEventId(omitId);
  return { ...omitId, eventId: id };
}

describe('16F.6.A formal distributed event model', () => {
  it('compareLogicalTime orders counter then nodeId', () => {
    expect(compareLogicalTime(lt(1, 'a'), lt(2, 'a'))).toBeLessThan(0);
    expect(compareLogicalTime(lt(1, 'b'), lt(1, 'a'))).toBeGreaterThan(0);
    expect(compareLogicalTime(lt(1, 'n'), lt(1, 'n'))).toBe(0);
  });

  it('serializeLogicalTime is stable for same logical instant', () => {
    expect(serializeLogicalTime(lt(3, 'n1'))).toBe(serializeLogicalTime(lt(3, 'n1')));
  });

  it('deterministic ordering: shuffled events sort to identical order', () => {
    const a = ev({
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence: 1,
      type: 'T',
      payload: { x: 1 },
    });
    const b = ev({
      nodeId: 'n2',
      logicalTime: lt(2, 'n2'),
      sequence: 1,
      type: 'T',
      payload: { x: 2 },
    });
    const c = ev({
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence: 2,
      type: 'T',
      payload: { x: 3 },
    });
    const expected = [a, c, b];
    const shuffled = [c, a, b];
    const sorted1 = [...shuffled].sort(compareDistributedEvents);
    const sorted2 = [...expected].sort(compareDistributedEvents);
    expect(sorted1.map((e) => e.eventId)).toEqual(sorted2.map((e) => e.eventId));
    expect(sorted1).toEqual(sorted2);
  });

  it('ordering relation: transitivity and antisymmetry on a small set', () => {
    const events = [
      ev({ nodeId: 'n1', logicalTime: lt(1, 'n1'), sequence: 1, type: 'A', payload: {} }),
      ev({ nodeId: 'n1', logicalTime: lt(1, 'n1'), sequence: 2, type: 'B', payload: {} }),
      ev({ nodeId: 'n2', logicalTime: lt(2, 'n2'), sequence: 1, type: 'C', payload: {} }),
    ];
    const [x, y, z] = events;
    expect(compareDistributedEvents(x, y)).toBeLessThan(0);
    expect(compareDistributedEvents(y, z)).toBeLessThan(0);
    expect(compareDistributedEvents(x, z)).toBeLessThan(0);
    expect(compareDistributedEvents(x, x)).toBe(0);
    expect(compareDistributedEvents(x, y)).toBe(-compareDistributedEvents(y, x));
  });

  it('property: many shuffles converge to one sorted order', () => {
    const pool = [
      ev({ nodeId: 'a', logicalTime: lt(10, 'a'), sequence: 1, type: 'T', payload: { i: 0 } }),
      ev({ nodeId: 'b', logicalTime: lt(5, 'b'), sequence: 1, type: 'T', payload: { i: 1 } }),
      ev({ nodeId: 'a', logicalTime: lt(10, 'a'), sequence: 2, type: 'T', payload: { i: 2 } }),
      ev({ nodeId: 'c', logicalTime: lt(1, 'c'), sequence: 1, type: 'T', payload: { i: 3 } }),
    ];
    const canonical = [...pool].sort(compareDistributedEvents);
    for (let i = 0; i < 54; i++) {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const sorted = shuffled.sort(compareDistributedEvents);
      expect(sorted.map((e) => e.eventId)).toEqual(canonical.map((e) => e.eventId));
    }
  });

  it('event identity: same content yields same eventId; mutated payload differs', () => {
    const base = {
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence: 1,
      type: 'MSG',
      payload: { order: ['b', 'a'] },
    };
    const id1 = deriveDeterministicEventId(base);
    const id2 = deriveDeterministicEventId({ ...base });
    expect(id1).toBe(id2);
    expect(id1.startsWith('sha256-')).toBe(true);

    const id3 = deriveDeterministicEventId({ ...base, payload: { order: ['a', 'b'] } });
    expect(id3).not.toBe(id1);
  });

  it('global input hash: same logical input same hash; reordering inputs same after normalize', () => {
    const e1 = ev({
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence: 1,
      type: 'A',
      payload: {},
    });
    const e2 = ev({
      nodeId: 'n1',
      logicalTime: lt(2, 'n1'),
      sequence: 2,
      type: 'B',
      payload: {},
    });

    const g1: GlobalInput = {
      nodeConfigs: {
        z: { nodeId: 'z', configHash: 'hz' },
        a: { nodeId: 'a', configHash: 'ha' },
      },
      events: [e1, e2],
      adminInputs: [
        { type: 'x', logicalTime: lt(2, 'adm'), payload: { k: 1 } },
        { type: 'y', logicalTime: lt(1, 'adm'), payload: { k: 2 } },
      ],
    };

    const g2: GlobalInput = {
      nodeConfigs: {
        a: { nodeId: 'a', configHash: 'ha' },
        z: { nodeId: 'z', configHash: 'hz' },
      },
      events: [e2, e1],
      adminInputs: [
        { type: 'y', logicalTime: lt(1, 'adm'), payload: { k: 2 } },
        { type: 'x', logicalTime: lt(2, 'adm'), payload: { k: 1 } },
      ],
    };

    expect(hashGlobalInput(g1)).toBe(hashGlobalInput(g2));
  });

  it('duplicate eventId is rejected', () => {
    const e = ev({
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence: 1,
      type: 'A',
      payload: {},
    });
    const dup: GlobalInput = {
      nodeConfigs: { n1: { nodeId: 'n1', configHash: 'h' } },
      events: [e, { ...e }],
    };
    expect(() => normalizeGlobalInput(dup)).toThrow(DistributedInputValidationError);
    expect(() => normalizeGlobalInput(dup)).toThrow(/duplicate eventId/);
  });

  it('non-monotonic sequence per node fails validation', () => {
    const e1 = ev({
      nodeId: 'n1',
      logicalTime: lt(5, 'n1'),
      sequence: 1,
      type: 'A',
      payload: { k: 1 },
    });
    const e2 = ev({
      nodeId: 'n1',
      logicalTime: lt(5, 'n1'),
      sequence: 1,
      type: 'B',
      payload: { k: 2 },
    });
    const g: GlobalInput = {
      nodeConfigs: { n1: { nodeId: 'n1', configHash: 'h' } },
      events: [e1, e2],
    };
    expect(() => normalizeGlobalInput(g)).toThrow(DistributedInputValidationError);
    expect(() => normalizeGlobalInput(g)).toThrow(/strictly increasing/);
  });

  it('serialization stability: serialize twice yields identical string', () => {
    const e = ev({
      nodeId: 'n1',
      logicalTime: lt(0, 'n1'),
      sequence: 1,
      type: 'T',
      payload: { z: 1, a: 2 },
    });
    const c = canonicalizeDistributedEvent(e);
    const s1 = serializeDistributedEvent(c);
    const s2 = serializeDistributedEvent(c);
    expect(s1).toBe(s2);
    expect(hashDistributedEvent(e)).toBe(hashDistributedEvent(c));
  });

  it('wrong eventId fails validation', () => {
    const e: DistributedEvent = {
      eventId: 'wrong',
      nodeId: 'n1',
      logicalTime: lt(0, 'n1'),
      sequence: 1,
      type: 'T',
      payload: {},
    };
    expect(() => validateDistributedEvent(e)).toThrow(DistributedInputValidationError);
  });

  it('nodeId must match logicalTime.nodeId', () => {
    const raw = {
      nodeId: 'n1',
      logicalTime: lt(0, 'n2'),
      sequence: 1,
      type: 'T',
      payload: {},
    };
    const id = deriveDeterministicEventId(raw);
    const e: DistributedEvent = { ...raw, eventId: id };
    expect(() => validateDistributedEvent(e)).toThrow(/logicalTime\.nodeId/);
  });

  it('logical time monotonicity: decreasing counter for same node fails', () => {
    const earlier = ev({
      nodeId: 'n1',
      logicalTime: lt(2, 'n1'),
      sequence: 1,
      type: 'A',
      payload: {},
    });
    const later = ev({
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence: 2,
      type: 'B',
      payload: {},
    });
    expect(() => assertLogicalTimeMonotonicPerNode([earlier, later])).toThrow(
      DistributedInputValidationError,
    );
    expect(() => assertLogicalTimeMonotonicPerNode([earlier, later])).toThrow(/logicalTime not monotonic/);
  });

  it('logical time equality edge: same logicalTime with increasing sequence is valid', () => {
    const e1 = ev({
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence: 1,
      type: 'A',
      payload: {},
    });
    const e2 = ev({
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence: 2,
      type: 'B',
      payload: {},
    });
    expect(() =>
      normalizeGlobalInput({
        nodeConfigs: { n1: { nodeId: 'n1', configHash: 'h' } },
        events: [e1, e2],
      }),
    ).not.toThrow();
  });

  it('canonical equality: same logical content (different instances) is equal', () => {
    const base = {
      nodeId: 'n1',
      logicalTime: lt(0, 'n1'),
      sequence: 1,
      type: 'T',
      payload: { z: 1 },
    };
    const id = deriveDeterministicEventId(base);
    const a: DistributedEvent = { ...base, eventId: id };
    const b: DistributedEvent = { ...base, eventId: id };
    expect(areDistributedEventsCanonicallyEqual(a, b)).toBe(true);
    expect(() => assertDistributedEventsCanonicallyEqual(a, b)).not.toThrow();
  });

  it('canonical equality: payload difference is not equal', () => {
    const a = ev({
      nodeId: 'n1',
      logicalTime: lt(0, 'n1'),
      sequence: 1,
      type: 'T',
      payload: { x: 1 },
    });
    const b = ev({
      nodeId: 'n1',
      logicalTime: lt(0, 'n1'),
      sequence: 1,
      type: 'T',
      payload: { x: 2 },
    });
    expect(areDistributedEventsCanonicallyEqual(a, b)).toBe(false);
    expect(() => assertDistributedEventsCanonicallyEqual(a, b)).toThrow(DistributedInputValidationError);
  });

  it('canonical equality: same payload, different key order', () => {
    const fields = {
      nodeId: 'n1',
      logicalTime: lt(0, 'n1'),
      sequence: 1,
      type: 'T',
    };
    const id1 = deriveDeterministicEventId({ ...fields, payload: { b: 1, a: 2 } });
    const id2 = deriveDeterministicEventId({ ...fields, payload: { a: 2, b: 1 } });
    expect(id1).toBe(id2);
    const a: DistributedEvent = { ...fields, eventId: id1, payload: { b: 1, a: 2 } };
    const b: DistributedEvent = { ...fields, eventId: id2, payload: { a: 2, b: 1 } };
    expect(areDistributedEventsCanonicallyEqual(a, b)).toBe(true);
  });

  it('traceability: missing parent fails', () => {
    const child = ev({
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence: 1,
      type: 'C',
      payload: {},
      parentEventId: 'sha256-nonexistent',
    });
    expect(() =>
      normalizeGlobalInput({
        nodeConfigs: { n1: { nodeId: 'n1', configHash: 'h' } },
        events: [child],
      }),
    ).toThrow(/parentEventId not found/);
  });

  it('traceability: cycle fails', () => {
    const stub = (eventId: string, sequence: number, parentEventId?: string): DistributedEvent => ({
      eventId,
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence,
      type: 'T',
      payload: {},
      ...(parentEventId !== undefined ? { parentEventId } : {}),
    });
    expect(() =>
      validateEventTraceability([stub('ev-b', 2, 'ev-a'), stub('ev-a', 1, 'ev-b')]),
    ).toThrow(/cycle/);
  });

  it('rejects duplicate entries in parentEventIds', () => {
    const root = ev({
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence: 1,
      type: 'R',
      payload: {},
    });
    expect(() =>
      deriveDeterministicEventId({
        nodeId: 'n1',
        logicalTime: lt(2, 'n1'),
        sequence: 2,
        type: 'C',
        payload: {},
        parentEventIds: [root.eventId, root.eventId],
      }),
    ).toThrow(/duplicates/);
  });

  it('legacy parentEventId plus parentEventIds requires inclusion', () => {
    const root = ev({
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence: 1,
      type: 'R',
      payload: {},
    });
    expect(() =>
      deriveDeterministicEventId({
        nodeId: 'n1',
        logicalTime: lt(2, 'n1'),
        sequence: 2,
        type: 'C',
        payload: {},
        parentEventId: root.eventId,
        parentEventIds: ['sha256-other'],
      }),
    ).toThrow(/parentEventId must be included/);

    const goodEv = ev({
      nodeId: 'n1',
      logicalTime: lt(2, 'n1'),
      sequence: 2,
      type: 'C',
      payload: {},
      parentEventId: root.eventId,
      parentEventIds: [root.eventId],
    });
    expect(() =>
      normalizeGlobalInput({
        nodeConfigs: { n1: { nodeId: 'n1', configHash: 'h' } },
        events: [root, goodEv],
      }),
    ).not.toThrow();
  });

  it('derives same eventId when parentEventIds order differs (canonical sort)', () => {
    const root = ev({
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence: 1,
      type: 'R',
      payload: {},
    });
    const other = ev({
      nodeId: 'n2',
      logicalTime: lt(1, 'n2'),
      sequence: 1,
      type: 'O',
      payload: {},
    });
    const forwards = [root.eventId, other.eventId].sort((a, b) => a.localeCompare(b));
    const backwards = [other.eventId, root.eventId].sort((a, b) => a.localeCompare(b));
    expect(forwards).toEqual(backwards);
    const base = {
      nodeId: 'n3',
      logicalTime: lt(1, 'n3'),
      sequence: 1,
      type: 'M',
      payload: {},
    };
    const idA = deriveDeterministicEventId({ ...base, parentEventIds: [root.eventId, other.eventId] });
    const idB = deriveDeterministicEventId({ ...base, parentEventIds: [other.eventId, root.eventId] });
    expect(idA).toBe(idB);
  });

  it('validateCausalConsistency reports structural errors when traceability fails', () => {
    const orphan = ev({
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence: 1,
      type: 'X',
      payload: {},
      parentEventId: 'sha256-missing',
    });
    const n: NormalizedGlobalInput = Object.freeze({
      nodeConfigs: Object.freeze([{ nodeId: 'n1', configHash: 'h' }]),
      events: Object.freeze([orphan]),
      adminInputs: Object.freeze([]),
    });
    const r = validateCausalConsistency(n);
    expect(r.valid).toBe(false);
    expect(r.structuralErrors !== undefined && r.structuralErrors.length > 0).toBe(true);
  });

  it('traceability: valid chain succeeds', () => {
    const root = ev({
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence: 1,
      type: 'R',
      payload: {},
    });
    const child = ev({
      nodeId: 'n1',
      logicalTime: lt(2, 'n1'),
      sequence: 2,
      type: 'C',
      payload: {},
      parentEventId: root.eventId,
    });
    expect(() =>
      normalizeGlobalInput({
        nodeConfigs: { n1: { nodeId: 'n1', configHash: 'h' } },
        events: [root, child],
      }),
    ).not.toThrow();
  });

  it('certifyGlobalInput returns full invariant coverage', () => {
    const e1 = ev({
      nodeId: 'n1',
      logicalTime: lt(1, 'n1'),
      sequence: 1,
      type: 'A',
      payload: {},
    });
    const certified = certifyGlobalInput({
      nodeConfigs: { n1: { nodeId: 'n1', configHash: 'h' } },
      events: [e1],
    });
    expect(certified.invariantCoverage).toHaveLength(DISTRIBUTED_INVARIANT_DECLARATIONS.length);
    expect(certified.invariantCoverage.every((c) => c.enforced)).toBe(true);
    expect(certified.hash.startsWith('sha256-')).toBe(true);
  });

  it('validateNormalizedGlobalInputWithResult returns coverage on success', () => {
    const n = normalizeGlobalInput({
      nodeConfigs: { n1: { nodeId: 'n1', configHash: 'h' } },
      events: [
        ev({
          nodeId: 'n1',
          logicalTime: lt(1, 'n1'),
          sequence: 1,
          type: 'A',
          payload: {},
        }),
      ],
    });
    const r = validateNormalizedGlobalInputWithResult(n);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.invariantCoverage).toHaveLength(DISTRIBUTED_INVARIANT_DECLARATIONS.length);
    expect(r.causalInvariantCoverage).toHaveLength(CAUSAL_INVARIANT_DECLARATIONS.length);
  });
});

describe('16F.6.C.B.1 event identity + causal DAG foundation', () => {
  it('Event identity determinism', () => {
    const e1 = createEvent({ type: 'A', payload: { x: 1 }, timestampLogical: 1 });
    const e2 = createEvent({ type: 'A', payload: { x: 1 }, timestampLogical: 1 });
    expect(e1.id).toBe(e2.id);
  });

  it('Canonicalization idempotency', () => {
    const e = createEvent({ type: 'A', payload: { z: 1, a: 2 }, timestampLogical: 1 });
    const c1 = canonicalizeEvent(e);
    const c2 = canonicalizeEvent(c1);
    expect(stableStringify(c1)).toBe(stableStringify(c2));
  });

  it('Parent ordering invariance', () => {
    const p1 = createEvent({ type: 'P', payload: { a: 1 }, timestampLogical: 1 });
    const p2 = createEvent({ type: 'P', payload: { b: 2 }, timestampLogical: 2 });
    const c1 = createEvent({
      type: 'C',
      payload: { x: 1 },
      timestampLogical: 3,
      parents: [p1.id, p2.id],
    });
    const c2 = createEvent({
      type: 'C',
      payload: { x: 1 },
      timestampLogical: 3,
      parents: [p2.id, p1.id],
    });
    expect(c1.id).toBe(c2.id);
  });

  it('Parent deduplication: repeated parent ids do not change identity', () => {
    const p1 = createEvent({ type: 'P', payload: { a: 1 }, timestampLogical: 1 });
    const p2 = createEvent({ type: 'P', payload: { b: 2 }, timestampLogical: 2 });
    const e1 = createEvent({
      type: 'C',
      payload: { x: 1 },
      timestampLogical: 3,
      parents: [p1.id, p2.id, p1.id],
    });
    const e2 = createEvent({
      type: 'C',
      payload: { x: 1 },
      timestampLogical: 3,
      parents: [p2.id, p1.id],
    });
    expect(e1.id).toBe(e2.id);
  });

  it('DAG insertion: parent then child', () => {
    const g = new EventGraph();
    const p = createEvent({ type: 'P', payload: { a: 1 }, timestampLogical: 1 });
    const c = createEvent({ type: 'C', payload: { a: 2 }, timestampLogical: 2, parents: [p.id] });
    g.addEvent(p);
    g.addEvent(c);
    expect(g.getNode(p.id)?.children).toContain(c.id);
    expect(g.getNode(c.id)?.parents).toEqual([p.id]);
  });

  it('Cycle detection: direct cycle must throw', () => {
    const g = new EventGraph();
    const a = createEvent({ type: 'A', payload: { a: 1 }, timestampLogical: 1 });
    g.addEvent(a);
    const bad = { ...a, parents: [a.id] };
    expect(() => g.addEvent(bad)).toThrow(/Cycle detected|event\.id mismatch|Invalid event id/);
  });

  it('Self-reference rejection in graph addEvent', () => {
    const g = new EventGraph();
    const base = createEvent({ type: 'A', payload: { a: 1 }, timestampLogical: 1 });
    const self = {
      ...base,
      parents: [base.id],
    };
    expect(() => g.addEvent(self)).toThrow(/Event cannot reference itself|Invalid event id/);
  });

  it('Duplicate parent rejection (defensive)', () => {
    const g = new EventGraph();
    const p = createEvent({ type: 'P', payload: { a: 1 }, timestampLogical: 1 });
    g.addEvent(p);
    const good = createEvent({ type: 'C', payload: { x: 1 }, timestampLogical: 2, parents: [p.id] });
    const bad = {
      ...good,
      parents: [p.id, p.id],
    };
    expect(() => g.addEvent(bad)).toThrow(/Duplicate parents not allowed|Invalid event id|Event is not canonical/);
  });

  it('Non-canonical parent order rejection (defensive)', () => {
    const g = new EventGraph();
    const a = createEvent({ type: 'A', payload: { a: 1 }, timestampLogical: 1 });
    const b = createEvent({ type: 'B', payload: { b: 1 }, timestampLogical: 2 });
    g.addEvent(a);
    g.addEvent(b);
    const good = createEvent({
      type: 'C',
      payload: { c: 1 },
      timestampLogical: 3,
      parents: [a.id, b.id],
    });
    const bad = {
      ...good,
      parents: [b.id, a.id],
    };
    expect(() => g.addEvent(bad)).toThrow(
      /Parents must be sorted deterministically|Invalid event id|Event is not canonical/,
    );
  });

  it('Event immutability: parents array cannot be mutated', () => {
    const e = createEvent({ type: 'I', payload: { x: 1 }, timestampLogical: 1 });
    expect(() => {
      (e.parents as unknown as string[]).push('X');
    }).toThrow();
  });

  it('happensBefore over chain A->B->C', () => {
    const g = new EventGraph();
    const a = createEvent({ type: 'A', payload: {}, timestampLogical: 1 });
    const b = createEvent({ type: 'B', payload: {}, timestampLogical: 2, parents: [a.id] });
    const c = createEvent({ type: 'C', payload: {}, timestampLogical: 3, parents: [b.id] });
    g.addEvent(a);
    g.addEvent(b);
    g.addEvent(c);
    expect(happensBefore(a.id, c.id, g)).toBe(true);
    expect(happensBefore(c.id, a.id, g)).toBe(false);
  });

  it('Deterministic topo sort regardless of insertion order', () => {
    const a = createEvent({ type: 'A', payload: {}, timestampLogical: 1 });
    const b = createEvent({ type: 'B', payload: {}, timestampLogical: 2, parents: [a.id] });
    const c = createEvent({ type: 'C', payload: {}, timestampLogical: 3, parents: [a.id] });
    const d = createEvent({ type: 'D', payload: {}, timestampLogical: 4, parents: [b.id, c.id] });
    const all = [a, b, c, d];

    const g1 = new EventGraph();
    for (const e of all) g1.addEvent(e);
    const t1 = topologicalSort(g1);

    const g2 = new EventGraph();
    const reordered = [a, c, b, d];
    for (const e of reordered) g2.addEvent(e);
    const t2 = topologicalSort(g2);
    expect(t1).toEqual(t2);
  });
});
