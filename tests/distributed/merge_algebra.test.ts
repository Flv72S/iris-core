import { describe, expect, it } from 'vitest';

import {
  areEventDagConcurrent,
  computeDepth,
  mergeGraphs,
  resolveConflict,
  serializeEventGraph,
  topologicalSortDepthDominant,
} from '../../src/distributed/merge_algebra';
import { createEvent, EventGraph, happensBefore, topologicalSort } from '../../src/distributed/event_model';
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

function graphFromEventsInOrder(events: readonly ReturnType<typeof createEvent>[], order: readonly string[]): EventGraph {
  const byId = new Map(events.map((e) => [e.id, e]));
  const g = new EventGraph();
  for (const id of order) {
    g.addEvent(byId.get(id)!);
  }
  return g;
}

/** Valid topological insertion: only shuffles among currently ready nodes (all parents already in graph). */
function graphFromEventsRandomTopo(events: readonly ReturnType<typeof createEvent>[], seed: number): EventGraph {
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

describe('16F.6.C.B.2 EventGraph merge algebra (CRDT-grade)', () => {
  it('idempotency: merge(G, G) serializes identically to G', () => {
    const r = createEvent({ type: 'root', payload: { k: 0 }, timestampLogical: 0, parents: [] });
    const a = createEvent({ type: 'a', payload: { x: 1 }, timestampLogical: 1, parents: [r.id] });
    const events = [r, a];
    const g = graphFromEventsInOrder(events, [r.id, a.id]);
    const m = mergeGraphs(g, g);
    expect(serializeEventGraph(m)).toBe(serializeEventGraph(g));
  });

  it('commutativity on canonical serialization', () => {
    const r1 = createEvent({ type: 'r1', payload: { u: 1 }, timestampLogical: 0, parents: [] });
    const r2 = createEvent({ type: 'r2', payload: { u: 2 }, timestampLogical: 0, parents: [] });
    const x = createEvent({ type: 'x', payload: { n: 1 }, timestampLogical: 1, parents: [r1.id] });
    const y = createEvent({ type: 'y', payload: { n: 2 }, timestampLogical: 1, parents: [r2.id] });

    const ga = graphFromEventsInOrder([r1, r2, x], [r1.id, r2.id, x.id]);
    const gb = graphFromEventsInOrder([r1, r2, y], [r1.id, r2.id, y.id]);

    const ab = mergeGraphs(ga, gb);
    const ba = mergeGraphs(gb, ga);
    expect(serializeEventGraph(ab)).toBe(serializeEventGraph(ba));
  });

  it('associativity on canonical serialization', () => {
    const r = createEvent({ type: 'root', payload: { z: 0 }, timestampLogical: 0, parents: [] });
    const a = createEvent({ type: 'a', payload: { i: 1 }, timestampLogical: 1, parents: [r.id] });
    const b = createEvent({ type: 'b', payload: { i: 2 }, timestampLogical: 2, parents: [r.id] });
    const c = createEvent({ type: 'c', payload: { i: 3 }, timestampLogical: 3, parents: [r.id] });

    // Only one valid insertion order per {r,*} chain: parent `r` before child.
    const gA = graphFromEventsInOrder([r, a], [r.id, a.id]);
    const gB = graphFromEventsInOrder([r, b], [r.id, b.id]);
    const gC = graphFromEventsInOrder([r, c], [r.id, c.id]);

    const left = mergeGraphs(mergeGraphs(gA, gB), gC);
    const right = mergeGraphs(gA, mergeGraphs(gB, gC));
    expect(serializeEventGraph(left)).toBe(serializeEventGraph(right));
  });

  it('deterministic merge: repeated binary merges same serialization', () => {
    const r = createEvent({ type: 'root', payload: null, timestampLogical: 0, parents: [] });
    const a = createEvent({ type: 'a', payload: { v: 'a' }, timestampLogical: 1, parents: [r.id] });
    const b = createEvent({ type: 'b', payload: { v: 'b' }, timestampLogical: 2, parents: [r.id] });

    const g1 = graphFromEventsInOrder([r, a, b], [r.id, a.id, b.id]);
    const g2 = graphFromEventsInOrder([r, a, b], [r.id, b.id, a.id]);

    const m1 = mergeGraphs(g1, g2);
    const m2 = mergeGraphs(g1, g2);
    expect(serializeEventGraph(m1)).toBe(serializeEventGraph(m2));
  });

  it('concurrent conflict: resolveConflict favors longer chain; depth-dominant topo orders consistently', () => {
    const r = createEvent({ type: 'root', payload: { t: 0 }, timestampLogical: 0, parents: [] });
    const mid = createEvent({
      type: 'mid',
      payload: { id: 'mid' },
      timestampLogical: 1,
      parents: [r.id],
    });
    const chainTip = createEvent({
      type: 'chainTip',
      payload: { id: 'tip' },
      timestampLogical: 2,
      parents: [mid.id],
    });
    // Shallow: depth 1; deep leaf: depth 3 — concurrent branches from r.
    const shallow = createEvent({
      type: 'leafS',
      payload: { m: 1 },
      timestampLogical: 10,
      parents: [r.id],
    });
    const deep = createEvent({
      type: 'leafD',
      payload: { m: 2 },
      timestampLogical: 11,
      parents: [chainTip.id],
    });

    const g = graphFromEventsInOrder(
      [r, mid, chainTip, shallow, deep],
      [r.id, mid.id, chainTip.id, shallow.id, deep.id],
    );

    expect(areEventDagConcurrent(shallow.id, deep.id, g)).toBe(true);
    expect(happensBefore(shallow.id, deep.id, g)).toBe(false);
    expect(happensBefore(deep.id, shallow.id, g)).toBe(false);

    const w = resolveConflict(
      g.getNode(shallow.id)!.event,
      g.getNode(deep.id)!.event,
      g,
    );
    expect(w.id).toBe(deep.id);

    const order = topologicalSortDepthDominant(g);
    expect(order.indexOf(deep.id)).toBeLessThan(order.indexOf(shallow.id));
  });

  it('no data loss: all event ids from operands appear in merged graph', () => {
    const r1 = createEvent({ type: 'r1', payload: { q: 1 }, timestampLogical: 0, parents: [] });
    const r2 = createEvent({ type: 'r2', payload: { q: 2 }, timestampLogical: 0, parents: [] });
    const e1 = createEvent({ type: 'e1', payload: { q: 3 }, timestampLogical: 1, parents: [r1.id] });
    const e2 = createEvent({ type: 'e2', payload: { q: 4 }, timestampLogical: 1, parents: [r2.id] });

    const ga = graphFromEventsInOrder([r1, r2, e1], [r1.id, r2.id, e1.id]);
    const gb = graphFromEventsInOrder([r1, r2, e2], [r1.id, r2.id, e2.id]);
    const m = mergeGraphs(ga, gb);
    const want = new Set([...ga.ids(), ...gb.ids()]);
    const got = new Set(m.ids());
    expect(got).toEqual(want);
  });

  it('large merge stability: permutation of insertion order does not change merged serialization', () => {
    const r = createEvent({ type: 'root', payload: { s: 0 }, timestampLogical: 0, parents: [] });
    const chain: ReturnType<typeof createEvent>[] = [r];
    let last = r.id;
    for (let i = 0; i < 8; i++) {
      const e = createEvent({
        type: `L${i}`,
        payload: { i },
        timestampLogical: i + 1,
        parents: [last],
      });
      chain.push(e);
      last = e.id;
    }
    const side = createEvent({
      type: 'side',
      payload: { side: true },
      timestampLogical: 99,
      parents: [r.id],
    });
    chain.push(side);

    const sinks: string[] = [];

    for (let seed = 0; seed < 5; seed++) {
      const g = graphFromEventsRandomTopo(chain, seed + 100);
      sinks.push(serializeEventGraph(g));
    }

    const mergedFromSeeds: string[] = [];
    for (let seed = 0; seed < 5; seed++) {
      const ga = graphFromEventsRandomTopo(chain, seed + 200);
      const gb = graphFromEventsRandomTopo(chain, seed + 300);
      mergedFromSeeds.push(serializeEventGraph(mergeGraphs(ga, gb)));
    }

    expect(new Set(sinks).size).toBe(1);
    expect(new Set(mergedFromSeeds).size).toBe(1);
  });

  it('computeDepth matches max-chain definition', () => {
    const r = createEvent({ type: 'r', payload: null, timestampLogical: 0, parents: [] });
    const a = createEvent({ type: 'a', payload: null, timestampLogical: 1, parents: [r.id] });
    const b = createEvent({ type: 'b', payload: null, timestampLogical: 2, parents: [a.id] });
    const g = graphFromEventsInOrder([r, a, b], [r.id, a.id, b.id]);
    expect(computeDepth(r.id, g)).toBe(0);
    expect(computeDepth(a.id, g)).toBe(1);
    expect(computeDepth(b.id, g)).toBe(2);
  });

  it('topologicalSort remains valid; depth-dominant sort refines ties without breaking constraints', () => {
    const r = createEvent({ type: 'r', payload: null, timestampLogical: 0, parents: [] });
    const c1 = createEvent({ type: 'c1', payload: { x: 1 }, timestampLogical: 1, parents: [r.id] });
    const c2 = createEvent({ type: 'c2', payload: { x: 2 }, timestampLogical: 2, parents: [r.id] });
    const g = graphFromEventsInOrder([r, c1, c2], [r.id, c1.id, c2.id]);

    const base = topologicalSort(g);
    const dom = topologicalSortDepthDominant(g);
    expect(dom.length).toBe(base.length);
    const idx = new Map(dom.map((id, i) => [id, i]));
    for (const id of dom) {
      const n = g.getNode(id)!;
      for (const p of n.parents) {
        expect(idx.get(p)!).toBeLessThan(idx.get(id)!);
      }
    }
    expect(new Set(dom).size).toBe(dom.length);
  });

  it('equal depth concurrent pair: resolveConflict picks lexicographically larger id', () => {
    const r = createEvent({ type: 'r', payload: null, timestampLogical: 0, parents: [] });
    const u = createEvent({ type: 'u', payload: { a: 1 }, timestampLogical: 1, parents: [r.id] });
    const v = createEvent({ type: 'v', payload: { a: 2 }, timestampLogical: 2, parents: [r.id] });
    const g = graphFromEventsInOrder([r, u, v], [r.id, u.id, v.id]);
    expect(areEventDagConcurrent(u.id, v.id, g)).toBe(true);
    const w = resolveConflict(g.getNode(u.id)!.event, g.getNode(v.id)!.event, g);
    const expectWinner = deterministicCompare(u.id, v.id) >= 0 ? u.id : v.id;
    expect(w.id).toBe(expectWinner);
  });
});
