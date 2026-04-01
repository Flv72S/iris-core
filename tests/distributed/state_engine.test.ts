import { describe, expect, it } from 'vitest';

import { stableStringify } from '../../src/logging/audit';
import { createEvent, EventGraph, happensBefore, serializeEvent, type Event } from '../../src/distributed/event_model';
import { areEventDagConcurrent } from '../../src/distributed/merge_algebra';
import {
  applyEvent,
  createStateOpEvent,
  dominates,
  evaluateGraph,
  evaluateGraphStrict,
  extractOperation,
  mergeGraphs,
  resolveConflict,
  serializeEngineState,
  topologicalSortDominanceAware,
  validateDominanceOrdering,
} from '../../src/distributed/state_engine';
import { deterministicCompare } from '../../src/distributed/state_model';

function permuteDeterministic<T>(arr: readonly T[], seed: number): T[] {
  const out = [...arr];
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function graphFromEventsInOrder(events: readonly Event[], order: readonly string[]): EventGraph {
  const byId = new Map(events.map((e) => [e.id, e]));
  const g = new EventGraph();
  for (const id of order) {
    g.addEvent(byId.get(id)!);
  }
  return g;
}

/** Valid topological insertion: shuffle only among ready nodes. */
function graphFromEventsRandomTopo(events: readonly Event[], seed: number): EventGraph {
  const byId = new Map(events.map((e) => [e.id, e]));
  const ids = [...byId.keys()].sort(deterministicCompare);
  const children = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const id of ids) {
    children.set(id, []);
    indegree.set(id, 0);
  }
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
    children.set(id, children.get(id)!.sort(deterministicCompare));
  }
  const ready: string[] = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
  let seedIter = seed >>> 0;
  const g = new EventGraph();
  while (ready.length > 0) {
    const shuffled = permuteDeterministic(ready, seedIter);
    seedIter = (seedIter + 10007) >>> 0;
    const id = shuffled[0]!;
    ready.splice(ready.indexOf(id), 1);
    g.addEvent(byId.get(id)!);
    for (const child of children.get(id)!) {
      const next = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, next);
      if (next === 0) ready.push(child);
    }
  }
  return g;
}

describe('16F.6.C.B.2.bis/.ter state engine (CRDT + dominance consistency)', () => {
  it('dominates is total and matches causal / resolveConflict rules', () => {
    const r = createStateOpEvent({ op: { type: 'set', key: 'r', value: 0 }, parents: [] });
    const a = createStateOpEvent({ op: { type: 'set', key: 'a', value: 1 }, parents: [r.id] });
    const b = createStateOpEvent({ op: { type: 'set', key: 'b', value: 2 }, parents: [r.id] });
    const g = graphFromEventsInOrder([r, a, b], [r.id, a.id, b.id]);
    const ea = g.getNode(a.id)!.event;
    const eb = g.getNode(b.id)!.event;
    expect(happensBefore(r.id, a.id, g)).toBe(true);
    expect(dominates(ea, eb, g) !== dominates(eb, ea, g)).toBe(true);
    const w = resolveConflict(ea, eb, g);
    const loser = w.id === ea.id ? eb : ea;
    expect(dominates(w, loser, g)).toBe(true);
  });

  it('evaluation order respects resolveConflict dominance for all concurrent pairs', () => {
    const r = createStateOpEvent({ op: { type: 'set', key: 'base', value: 0 }, parents: [] });
    const mid = createStateOpEvent({ op: { type: 'set', key: 'm', value: 1 }, parents: [r.id] });
    const tip = createStateOpEvent({ op: { type: 'set', key: 't', value: 2 }, parents: [mid.id] });
    const shallow = createStateOpEvent({
      op: { type: 'set', key: 'conflict', value: 'shallow' },
      parents: [r.id],
    });
    const deep = createStateOpEvent({
      op: { type: 'set', key: 'conflict', value: 'deep' },
      parents: [tip.id],
    });
    const g = graphFromEventsInOrder([r, mid, tip, shallow, deep], [r.id, mid.id, tip.id, shallow.id, deep.id]);
    const ordered = topologicalSortDominanceAware(g);
    validateDominanceOrdering(ordered, g);
    const idx = new Map(ordered.map((e, i) => [e.id, i]));
    const ids = g.ids();
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const ida = ids[i]!;
        const idb = ids[j]!;
        if (!areEventDagConcurrent(ida, idb, g)) continue;
        const ea = g.getNode(ida)!.event;
        const eb = g.getNode(idb)!.event;
        const w = resolveConflict(ea, eb, g);
        const loserId = w.id === ea.id ? eb.id : ea.id;
        expect(idx.get(w.id)!).toBeGreaterThan(idx.get(loserId)!);
      }
    }
  });

  it('three+ concurrent SET on same key: last in dominance order wins; validation passes', () => {
    const r = createStateOpEvent({ op: { type: 'set', key: 'x', value: 0 }, parents: [] });
    const ops = [
      createStateOpEvent({ op: { type: 'set', key: 'K', value: 'v0' }, parents: [r.id] }),
      createStateOpEvent({ op: { type: 'set', key: 'K', value: 'v1' }, parents: [r.id] }),
      createStateOpEvent({ op: { type: 'set', key: 'K', value: 'v2' }, parents: [r.id] }),
    ];
    const order = [r.id, ...ops.map((e) => e.id).sort(deterministicCompare)];
    const g = graphFromEventsInOrder([r, ...ops], order);
    const ordEvents = topologicalSortDominanceAware(g);
    validateDominanceOrdering(ordEvents, g);
    let wEv = ops[0]!;
    for (let i = 1; i < ops.length; i++) {
      wEv = resolveConflict(wEv, ops[i]!, g);
    }
    const st = evaluateGraph(g);
    const opW = extractOperation(wEv);
    expect(opW.type).toBe('set');
    expect(st.K).toBe(opW.value);
  });

  it('dominance stress: random valid topo graphs validate and converge on merge', () => {
    const r = createStateOpEvent({ op: { type: 'set', key: 'seed', value: 0 }, parents: [] });
    const events: Event[] = [r];
    let last = r.id;
    for (let i = 0; i < 5; i++) {
      const e = createStateOpEvent({
        op: { type: 'set', key: `p${i}`, value: i },
        parents: [last],
      });
      events.push(e);
      last = e.id;
    }
    const side = createStateOpEvent({
      op: { type: 'set', key: 'side', value: 'S' },
      parents: [r.id],
    });
    events.push(side);

    for (let seed = 0; seed < 12; seed++) {
      const gA = graphFromEventsRandomTopo(events, seed + 1);
      const gB = graphFromEventsRandomTopo(events, seed + 900);
      const ord = topologicalSortDominanceAware(gA);
      validateDominanceOrdering(ord, gA);
      expect(serializeEngineState(evaluateGraph(mergeGraphs(gA, gB)))).toBe(
        serializeEngineState(evaluateGraph(mergeGraphs(gB, gA))),
      );
    }
  });

  it('deterministic evaluation: same graph → same serialized state', () => {
    const root = createStateOpEvent({ op: { type: 'set', key: 'x', value: 1 }, parents: [] });
    const a = createStateOpEvent({ op: { type: 'set', key: 'y', value: true }, parents: [root.id] });
    const events = [root, a];
    const g = graphFromEventsInOrder(events, [root.id, a.id]);
    const s1 = evaluateGraph(g);
    const s2 = evaluateGraph(g);
    expect(serializeEngineState(s1)).toBe(serializeEngineState(s2));
  });

  it('merge convergence: evaluate(merge(A,B)) === evaluate(merge(B,A))', () => {
    const r = createStateOpEvent({ op: { type: 'set', key: 'r', value: 0 }, parents: [] });
    const a = createStateOpEvent({ op: { type: 'set', key: 'a', value: 'A' }, parents: [r.id] });
    const b = createStateOpEvent({ op: { type: 'set', key: 'b', value: 'B' }, parents: [r.id] });

    const gA = graphFromEventsInOrder([r, a], [r.id, a.id]);
    const gB = graphFromEventsInOrder([r, b], [r.id, b.id]);

    const ab = mergeGraphs(gA, gB);
    const ba = mergeGraphs(gB, gA);
    expect(serializeEngineState(evaluateGraph(ab))).toBe(serializeEngineState(evaluateGraph(ba)));
  });

  it('associativity convergence on evaluated merge', () => {
    const r = createStateOpEvent({ op: { type: 'set', key: 'z', value: null }, parents: [] });
    const e1 = createStateOpEvent({ op: { type: 'set', key: 'k1', value: 1 }, parents: [r.id] });
    const e2 = createStateOpEvent({ op: { type: 'set', key: 'k2', value: 2 }, parents: [r.id] });
    const e3 = createStateOpEvent({ op: { type: 'set', key: 'k3', value: 3 }, parents: [r.id] });

    const g1 = graphFromEventsInOrder([r, e1], [r.id, e1.id]);
    const g2 = graphFromEventsInOrder([r, e2], [r.id, e2.id]);
    const g3 = graphFromEventsInOrder([r, e3], [r.id, e3.id]);

    const left = evaluateGraph(mergeGraphs(mergeGraphs(g1, g2), g3));
    const right = evaluateGraph(mergeGraphs(g1, mergeGraphs(g2, g3)));
    expect(serializeEngineState(left)).toBe(serializeEngineState(right));
  });

  it('concurrent SET same key: deeper chain wins; equal depth → larger EventId wins', () => {
    const r = createStateOpEvent({ op: { type: 'set', key: 'base', value: 0 }, parents: [] });
    const mid = createStateOpEvent({ op: { type: 'set', key: 'm', value: 1 }, parents: [r.id] });
    const tip = createStateOpEvent({ op: { type: 'set', key: 't', value: 2 }, parents: [mid.id] });

    const shallow = createStateOpEvent({
      op: { type: 'set', key: 'conflict', value: 'shallow' },
      parents: [r.id],
    });
    const deep = createStateOpEvent({
      op: { type: 'set', key: 'conflict', value: 'deep' },
      parents: [tip.id],
    });

    const g = graphFromEventsInOrder([r, mid, tip, shallow, deep], [r.id, mid.id, tip.id, shallow.id, deep.id]);
    const winner = resolveConflict(g.getNode(shallow.id)!.event, g.getNode(deep.id)!.event, g);
    expect(winner.id).toBe(deep.id);

    const st = evaluateGraph(g);
    expect(st.conflict).toBe('deep');

    const u = createStateOpEvent({
      op: { type: 'set', key: 'c2', value: 'u' },
      parents: [r.id],
    });
    const v = createStateOpEvent({
      op: { type: 'set', key: 'c2', value: 'v' },
      parents: [r.id],
    });
    const g2 = graphFromEventsInOrder(
      [r, u, v],
      [r.id, ...[u.id, v.id].sort(deterministicCompare)],
    );
    const w = resolveConflict(g2.getNode(u.id)!.event, g2.getNode(v.id)!.event, g2);
    const st2 = evaluateGraph(g2);
    const opW = extractOperation(g2.getNode(w.id)!.event);
    expect(opW.type).toBe('set');
    expect(st2.c2).toBe(opW.value);
  });

  it('concurrent delete vs set: last writer in eval order wins', () => {
    const r = createStateOpEvent({ op: { type: 'set', key: 'k', value: 'orig' }, parents: [] });
    const del = createStateOpEvent({ op: { type: 'delete', key: 'k' }, parents: [r.id] });
    const set = createStateOpEvent({ op: { type: 'set', key: 'k', value: 'new' }, parents: [r.id] });

    const g1 = graphFromEventsInOrder([r, del, set], [r.id, del.id, set.id]);
    const g2 = graphFromEventsInOrder([r, set, del], [r.id, set.id, del.id]);

    const win1 = resolveConflict(g1.getNode(del.id)!.event, g1.getNode(set.id)!.event, g1);
    const s1 = evaluateGraph(g1);
    const win2 = resolveConflict(g2.getNode(del.id)!.event, g2.getNode(set.id)!.event, g2);
    const s2 = evaluateGraph(g2);

    expect(win1.id).toBe(win2.id);
    expect(serializeEngineState(s1)).toBe(serializeEngineState(s2));
    if (extractOperation(win1).type === 'delete') {
      expect('k' in s1).toBe(false);
    } else {
      expect(s1.k).toBe('new');
    }
  });

  it('idempotent evaluation on same graph', () => {
    const e = createStateOpEvent({ op: { type: 'set', key: 'q', value: [1, 2] }, parents: [] });
    const g = graphFromEventsInOrder([e], [e.id]);
    const a = serializeEngineState(evaluateGraph(g));
    const b = serializeEngineState(evaluateGraph(g));
    expect(a).toBe(b);
  });

  it('fast vs strict evaluation produce identical state', () => {
    const root = createStateOpEvent({ op: { type: 'set', key: 'x', value: 1 }, parents: [] });
    const a = createStateOpEvent({ op: { type: 'set', key: 'x', value: 2 }, parents: [root.id] });
    const b = createStateOpEvent({ op: { type: 'delete', key: 'x' }, parents: [root.id] });
    const g = graphFromEventsInOrder([root, a, b], [root.id, a.id, b.id]);
    expect(serializeEngineState(evaluateGraph(g))).toBe(serializeEngineState(evaluateGraphStrict(g)));
  });

  it('no mutation: previous state reference and graph events unchanged', () => {
    const root = createStateOpEvent({ op: { type: 'set', key: 'x', value: 1 }, parents: [] });
    const g = graphFromEventsInOrder([root], [root.id]);
    const before = serializeEngineState(evaluateGraph(g));
    const snap = g.ids().map((id) => stableStringify(serializeEvent(g.getNode(id)!.event)));

    const next = createStateOpEvent({ op: { type: 'set', key: 'y', value: 2 }, parents: [root.id] });
    const beforeApply = evaluateGraph(g);
    const combined = graphFromEventsInOrder([root, next], [root.id, next.id]);
    const afterApply = applyEvent(beforeApply, next);

    expect(serializeEngineState(beforeApply)).toBe(before);
    expect(g.ids().map((id) => stableStringify(serializeEvent(g.getNode(id)!.event)))).toEqual(snap);
    expect(serializeEngineState(afterApply)).not.toBe(before);
    expect(Object.isFrozen(beforeApply)).toBe(true);
    expect(Object.isFrozen(afterApply)).toBe(true);
    expect(combined).toBeDefined();
  });

  it('rejects graphs with non–state-engine events', () => {
    const bad = createEvent({
      type: 'other',
      payload: { x: 1 },
      parents: [],
      timestampLogical: 0,
    });
    const g = graphFromEventsInOrder([bad], [bad.id]);
    expect(() => evaluateGraph(g)).toThrow(/non-state event/i);
  });

  it('randomized stress: varied topo builds and merge trees converge', () => {
    const r = createStateOpEvent({ op: { type: 'set', key: 'seed', value: 0 }, parents: [] });
    const events: Event[] = [r];
    let last = r.id;
    for (let i = 0; i < 6; i++) {
      const e = createStateOpEvent({
        op: { type: 'set', key: `p${i}`, value: i },
        parents: [last],
      });
      events.push(e);
      last = e.id;
    }
    const side = createStateOpEvent({
      op: { type: 'set', key: 'side', value: 'S' },
      parents: [r.id],
    });
    events.push(side);

    const sinks: string[] = [];
    for (let seed = 0; seed < 6; seed++) {
      const ga = graphFromEventsRandomTopo(events, seed + 1);
      const gb = graphFromEventsRandomTopo(events, seed + 50);
      sinks.push(serializeEngineState(evaluateGraph(mergeGraphs(ga, gb))));
    }
    expect(new Set(sinks).size).toBe(1);
  });

  it('evaluation order matches LWW: concurrent pair resolves to resolveConflict winner value', () => {
    const r = createStateOpEvent({ op: { type: 'set', key: 'x', value: 0 }, parents: [] });
    const a = createStateOpEvent({ op: { type: 'set', key: 'w', value: 'a' }, parents: [r.id] });
    const b = createStateOpEvent({ op: { type: 'set', key: 'w', value: 'b' }, parents: [r.id] });
    const g = graphFromEventsInOrder([r, a, b], [r.id, a.id, b.id]);
    const w = resolveConflict(g.getNode(a.id)!.event, g.getNode(b.id)!.event, g);
    const st = evaluateGraph(g);
    const opW = extractOperation(w);
    expect(opW.type).toBe('set');
    expect(st.w).toBe(opW.value);
  });
});
