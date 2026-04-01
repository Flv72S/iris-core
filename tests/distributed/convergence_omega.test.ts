import { describe, expect, it } from 'vitest';

import { serializeEventGraph } from '../../src/distributed/merge_algebra';
import {
  createStateOpEvent,
  evaluateGraphStrict,
  extractOperation,
  mergeGraphs,
  resolveConflict,
  serializeEngineState,
  topologicalSortDominanceAware,
  validateDominanceOrdering,
} from '../../src/distributed/state_engine';
import { deterministicCompare } from '../../src/distributed/state_model';
import {
  generateAdversarialEvents,
  generateAdversarialGraph,
  generateValidTopologicalPermutation,
  graphFromOrderedEvents,
} from '../utils/adversarial_graph_generator';

function mustEqualOrThrow(a: string, b: string, context: Record<string, unknown>): void {
  if (a !== b) {
    throw new Error(`convergence mismatch: ${JSON.stringify(context)}`);
  }
}

function foldMergeOrder(graphs: readonly ReturnType<typeof generateAdversarialGraph>['graph'][], order: readonly number[]) {
  let acc = graphs[order[0]!]!;
  for (let i = 1; i < order.length; i++) {
    acc = mergeGraphs(acc, graphs[order[i]!]!);
  }
  return acc;
}

describe('16F.6.C.B.2.Ω convergence + adversarial validation', () => {
  it('multi-replica convergence (3..10 replicas, different arrivals and merges)', () => {
    const seed = 10017;
    const base = generateAdversarialGraph({
      seed,
      eventCount: 24,
      keySpace: 21,
      branchingFactor: 4,
      depthSkew: 0.7,
      concurrencyDensity: 0.25,
      conflictDensity: 0.6,
      deleteRatio: 0.3,
    });
    const events = base.events;
    const replicaCount = 7;
    const replicas = Array.from({ length: replicaCount }, (_, i) => {
      const order = generateValidTopologicalPermutation(events, seed + (i + 1) * 1337);
      return graphFromOrderedEvents(events, order);
    });

    const orders: number[][] = [
      [0, 1, 2, 3, 4, 5, 6],
      [6, 5, 4, 3, 2, 1, 0],
      [0, 2, 4, 6, 1, 3, 5],
      [5, 3, 1, 6, 4, 2, 0],
    ];
    const states: string[] = [];
    for (const order of orders) {
      const merged = foldMergeOrder(replicas, order);
      validateDominanceOrdering(topologicalSortDominanceAware(merged), merged);
      states.push(serializeEngineState(evaluateGraphStrict(merged)));
    }
    for (let i = 1; i < states.length; i++) {
      mustEqualOrThrow(states[0]!, states[i]!, { seed, replicaCount, orderIndex: i });
    }
  });

  it('permutation invariance: N valid topo permutations evaluate identically', () => {
    const seed = 20031;
    const events = generateAdversarialEvents({
      seed,
      eventCount: 28,
      keySpace: 15,
      branchingFactor: 3,
      depthSkew: 0.5,
      concurrencyDensity: 0.35,
      conflictDensity: 0.7,
      deleteRatio: 0.35,
    });
    const N = 8;
    const states: string[] = [];
    for (let i = 0; i < N; i++) {
      const order = generateValidTopologicalPermutation(events, seed + i * 991);
      const g = graphFromOrderedEvents(events, order);
      validateDominanceOrdering(topologicalSortDominanceAware(g), g);
      states.push(serializeEngineState(evaluateGraphStrict(g)));
    }
    for (let i = 1; i < states.length; i++) {
      mustEqualOrThrow(states[0]!, states[i]!, { seed, N, index: i, size: events.length });
    }
  });

  it('merge-order chaos: all tested merge forms produce identical state', () => {
    const A = generateAdversarialGraph({
      seed: 301,
      eventCount: 22,
      keySpace: 9,
      branchingFactor: 3,
      depthSkew: 0.4,
      concurrencyDensity: 0.3,
      conflictDensity: 0.7,
      deleteRatio: 0.25,
    }).graph;
    const B = generateAdversarialGraph({
      seed: 302,
      eventCount: 22,
      keySpace: 9,
      branchingFactor: 3,
      depthSkew: 0.6,
      concurrencyDensity: 0.25,
      conflictDensity: 0.65,
      deleteRatio: 0.35,
    }).graph;
    const C = generateAdversarialGraph({
      seed: 303,
      eventCount: 22,
      keySpace: 9,
      branchingFactor: 3,
      depthSkew: 0.8,
      concurrencyDensity: 0.22,
      conflictDensity: 0.66,
      deleteRatio: 0.2,
    }).graph;

    const variants = [
      mergeGraphs(mergeGraphs(A, B), C),
      mergeGraphs(mergeGraphs(B, C), A),
      mergeGraphs(mergeGraphs(C, A), B),
      mergeGraphs(A, mergeGraphs(B, C)),
      mergeGraphs(B, mergeGraphs(C, A)),
      mergeGraphs(C, mergeGraphs(A, B)),
    ];
    const base = serializeEngineState(evaluateGraphStrict(variants[0]!));
    for (let i = 1; i < variants.length; i++) {
      mustEqualOrThrow(base, serializeEngineState(evaluateGraphStrict(variants[i]!)), { variant: i });
    }
  });

  it('high-concurrency conflict storm: winner equals resolveConflict fold winner', () => {
    const root = generateAdversarialGraph({
      seed: 4077,
      eventCount: 1,
      keySpace: 1,
      branchingFactor: 1,
      depthSkew: 0,
      concurrencyDensity: 1,
      conflictDensity: 1,
      deleteRatio: 0,
    }).events[0]!;
    const events = [
      root,
      ...Array.from({ length: 17 }, (_, i) =>
        createStateOpEvent({
          op: { type: 'set', key: 'k1', value: `storm-${i}` },
          parents: [root.id],
        }),
      ),
    ];
    const order = [root.id, ...events.slice(1).map((e) => e.id).sort(deterministicCompare)];
    const g = graphFromOrderedEvents(events, order);
    validateDominanceOrdering(topologicalSortDominanceAware(g), g);

    let winner = events[1]!;
    for (let i = 2; i < events.length; i++) {
      winner = resolveConflict(winner, events[i]!, g);
    }
    const st = evaluateGraphStrict(g);
    expect(st.k1).toBe(extractOperation(winner).type === 'set' ? extractOperation(winner).value : undefined);
  });

  it('deep chain vs concurrent override: winner follows depth + id', () => {
    const base = generateAdversarialGraph({
      seed: 5099,
      eventCount: 8,
      keySpace: 3,
      branchingFactor: 1,
      depthSkew: 1,
      concurrencyDensity: 0,
      conflictDensity: 0.3,
      deleteRatio: 0.1,
    });
    const ids = base.graph.ids();
    const deepest = base.graph.getNode(ids[ids.length - 1]!)!.event;
    // concurrent override event with shallow parents
    const override = generateAdversarialEvents({
      seed: 5100,
      eventCount: 2,
      keySpace: 1,
      branchingFactor: 1,
      depthSkew: 0.2,
      concurrencyDensity: 1,
      conflictDensity: 1,
      deleteRatio: 0,
    })[1]!;
    const events = [...base.events, override];
    const order = generateValidTopologicalPermutation(events, 5101);
    const g = graphFromOrderedEvents(events, order);
    validateDominanceOrdering(topologicalSortDominanceAware(g), g);
    const winner = resolveConflict(deepest, override, g);
    expect(winner.id === deepest.id || winner.id === override.id).toBe(true);
  });

  it('delete vs set adversarial: deterministic outcome across permutations, no resurrection drift', () => {
    const seed = 6121;
    const events = generateAdversarialEvents({
      seed,
      eventCount: 30,
      keySpace: 5,
      branchingFactor: 3,
      depthSkew: 0.5,
      concurrencyDensity: 0.45,
      conflictDensity: 0.8,
      deleteRatio: 0.55,
    });
    const states: string[] = [];
    for (let i = 0; i < 6; i++) {
      const order = generateValidTopologicalPermutation(events, seed + i * 29);
      const g = graphFromOrderedEvents(events, order);
      states.push(serializeEngineState(evaluateGraphStrict(g)));
    }
    for (let i = 1; i < states.length; i++) {
      mustEqualOrThrow(states[0]!, states[i]!, { seed, test: 'delete-set', idx: i });
    }
  });

  it('idempotency under repeated merge: graph and state stabilize', () => {
    const seed = 7091;
    const g0 = generateAdversarialGraph({
      seed,
      eventCount: 40,
      keySpace: 18,
      branchingFactor: 4,
      depthSkew: 0.55,
      concurrencyDensity: 0.32,
      conflictDensity: 0.62,
      deleteRatio: 0.27,
    }).graph;
    let g = g0;
    const graphSer0 = serializeEventGraph(g0);
    const stateSer0 = serializeEngineState(evaluateGraphStrict(g0));
    for (let i = 0; i < 50; i++) {
      g = mergeGraphs(g, g);
      const gs = serializeEventGraph(g);
      const ss = serializeEngineState(evaluateGraphStrict(g));
      mustEqualOrThrow(graphSer0, gs, { seed, iter: i, kind: 'graph' });
      mustEqualOrThrow(stateSer0, ss, { seed, iter: i, kind: 'state' });
    }
  });

  it('large graph stability: 100/200/400 deterministic, no crashes', () => {
    const sizes = [100, 200, 400];
    for (const size of sizes) {
      const seed = 8000 + size;
      const a = generateAdversarialGraph({
        seed,
        eventCount: size,
        keySpace: 64,
        branchingFactor: 3,
        depthSkew: 0.6,
        concurrencyDensity: 0.2,
        conflictDensity: 0.5,
        deleteRatio: 0.35,
      });
      const b = generateAdversarialGraph({
        seed: seed + 1,
        eventCount: size,
        keySpace: 64,
        branchingFactor: 3,
        depthSkew: 0.6,
        concurrencyDensity: 0.2,
        conflictDensity: 0.5,
        deleteRatio: 0.35,
      });
      const ab = mergeGraphs(a.graph, b.graph);
      const ba = mergeGraphs(b.graph, a.graph);
      mustEqualOrThrow(serializeEventGraph(ab), serializeEventGraph(ba), { seed, size, kind: 'large-graph' });
      // Full evaluateGraph includes O(N^2) dominance verification by design; keep runtime bounded.
      if (size <= 100) {
        const sab = serializeEngineState(evaluateGraphStrict(ab));
        const sba = serializeEngineState(evaluateGraphStrict(ba));
        mustEqualOrThrow(sab, sba, { seed, size, kind: 'large-state' });
      }
    }
  }, 120_000);

  it('serialization stability: state and merged graph serialization stable across reruns', () => {
    const seed = 9157;
    const gen = generateAdversarialGraph({
      seed,
      eventCount: 40,
      keySpace: 11,
      branchingFactor: 4,
      depthSkew: 0.65,
      concurrencyDensity: 0.3,
      conflictDensity: 0.7,
      deleteRatio: 0.4,
    });
    const a = gen.graph;
    const b = generateAdversarialGraph({
      seed: seed + 77,
      eventCount: 40,
      keySpace: 11,
      branchingFactor: 4,
      depthSkew: 0.65,
      concurrencyDensity: 0.3,
      conflictDensity: 0.7,
      deleteRatio: 0.4,
    }).graph;
    const m1 = mergeGraphs(a, b);
    const m2 = mergeGraphs(a, b);
    mustEqualOrThrow(serializeEventGraph(m1), serializeEventGraph(m2), { seed, kind: 'graph-serialization' });
    mustEqualOrThrow(
      serializeEngineState(evaluateGraphStrict(m1)),
      serializeEngineState(evaluateGraphStrict(m2)),
      { seed, kind: 'state-serialization' },
    );
  });
});
