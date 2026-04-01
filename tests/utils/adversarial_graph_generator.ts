import { Event, EventGraph } from '../../src/distributed/event_model';
import { createStateOpEvent, type EventOperation } from '../../src/distributed/state_engine';
import { deterministicCompare } from '../../src/distributed/state_model';

import { createSeededRandom } from './seeded_random';

export interface AdversarialGraphConfig {
  seed: number;
  eventCount: number;
  keySpace: number;
  branchingFactor: number;
  depthSkew: number;
  concurrencyDensity: number;
  conflictDensity: number;
  deleteRatio: number;
}

export interface GeneratedAdversarialGraph {
  readonly seed: number;
  readonly events: readonly Event[];
  readonly graph: EventGraph;
  readonly topologicalOrder: readonly string[];
}

export function graphFromOrderedEvents(events: readonly Event[], orderedIds: readonly string[]): EventGraph {
  const byId = new Map(events.map((e) => [e.id, e]));
  const g = new EventGraph();
  for (const id of orderedIds) {
    const ev = byId.get(id);
    if (ev === undefined) throw new Error(`graphFromOrderedEvents: unknown id ${id}`);
    g.addEvent(ev);
  }
  return g;
}

function bounded(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

function pickParents(
  ids: readonly string[],
  depths: ReadonlyMap<string, number>,
  cfg: AdversarialGraphConfig,
  seed: ReturnType<typeof createSeededRandom>,
): string[] {
  if (ids.length === 0) return [];
  if (seed.chance(cfg.concurrencyDensity)) return [];
  const parentCount = bounded(seed.nextInt(1, Math.max(2, cfg.branchingFactor + 1)), 1, Math.min(cfg.branchingFactor, ids.length));
  const picked = new Set<string>();
  let guard = 0;
  const guardMax = Math.max(64, ids.length * 8);
  while (picked.size < parentCount && guard < guardMax) {
    guard++;
    // depthSkew > 0.5 biases to deeper nodes; < 0.5 biases to shallow
    const tries = Math.max(1, Math.floor(2 + cfg.depthSkew * 6));
    let candidate = ids[seed.nextInt(0, ids.length)]!;
    for (let t = 0; t < tries; t++) {
      const c2 = ids[seed.nextInt(0, ids.length)]!;
      const d1 = depths.get(candidate) ?? 0;
      const d2 = depths.get(c2) ?? 0;
      const preferDeep = cfg.depthSkew >= 0.5;
      candidate = preferDeep ? (d2 > d1 ? c2 : candidate) : (d2 < d1 ? c2 : candidate);
    }
    picked.add(candidate);
  }
  if (picked.size < parentCount) {
    // Deterministic fallback guarantees termination.
    for (const id of ids) {
      picked.add(id);
      if (picked.size >= parentCount) break;
    }
  }
  return [...picked].sort(deterministicCompare);
}

function nextOperation(
  keys: readonly string[],
  hotKeys: readonly string[],
  cfg: AdversarialGraphConfig,
  seed: ReturnType<typeof createSeededRandom>,
): EventOperation {
  const keySource = seed.chance(cfg.conflictDensity) ? hotKeys : keys;
  const key = keySource[seed.nextInt(0, keySource.length)]!;
  if (seed.chance(cfg.deleteRatio)) return { type: 'delete', key };
  return { type: 'set', key, value: { v: seed.nextU32(), k: key } };
}

export function generateAdversarialEvents(config: AdversarialGraphConfig): readonly Event[] {
  const cfg: AdversarialGraphConfig = {
    ...config,
    eventCount: Math.max(1, config.eventCount),
    keySpace: Math.max(1, config.keySpace),
    branchingFactor: bounded(config.branchingFactor, 1, 16),
    depthSkew: bounded(config.depthSkew, 0, 1),
    concurrencyDensity: bounded(config.concurrencyDensity, 0, 1),
    conflictDensity: bounded(config.conflictDensity, 0, 1),
    deleteRatio: bounded(config.deleteRatio, 0, 1),
  };
  const rand = createSeededRandom(cfg.seed);
  const keys = Array.from({ length: cfg.keySpace }, (_, i) => `k${i + 1}`);
  const hotKeys = keys.slice(0, Math.min(keys.length, Math.max(1, Math.floor(cfg.keySpace / 4))));

  const events: Event[] = [];
  const ids: string[] = [];
  const depthById = new Map<string, number>();

  // Root event guarantees graph non-empty and deterministic baseline.
  const root = createStateOpEvent({ op: { type: 'set', key: keys[0]!, value: { root: true } }, parents: [] });
  events.push(root);
  ids.push(root.id);
  depthById.set(root.id, 0);

  for (let i = 1; i < cfg.eventCount; i++) {
    const parents = pickParents(ids, depthById, cfg, rand);
    const op = nextOperation(keys, hotKeys, cfg, rand);
    const ev = createStateOpEvent({ op, parents });
    events.push(ev);
    ids.push(ev.id);
    let depth = 0;
    for (const p of parents) depth = Math.max(depth, (depthById.get(p) ?? 0) + 1);
    depthById.set(ev.id, depth);

    // Inject explicit 3-way concurrent same-key conflicts.
    if (i + 2 < cfg.eventCount && rand.chance(cfg.conflictDensity * 0.15)) {
      const conflictKey = hotKeys[rand.nextInt(0, hotKeys.length)]!;
      const c1 = createStateOpEvent({ op: { type: 'set', key: conflictKey, value: `c1-${rand.nextU32()}` }, parents });
      const c2 = createStateOpEvent({ op: { type: 'set', key: conflictKey, value: `c2-${rand.nextU32()}` }, parents });
      const c3 = createStateOpEvent({ op: { type: 'delete', key: conflictKey }, parents });
      for (const c of [c1, c2, c3]) {
        events.push(c);
        ids.push(c.id);
        depthById.set(c.id, depth);
      }
      i += 2;
    }
  }

  return Object.freeze(events);
}

export function generateValidTopologicalPermutation(events: readonly Event[], seed: number): readonly string[] {
  const rand = createSeededRandom(seed);
  const byId = new Map(events.map((e) => [e.id, e]));
  const ids = [...byId.keys()].sort(deterministicCompare);
  const indegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const id of ids) {
    indegree.set(id, 0);
    children.set(id, []);
  }
  for (const id of ids) {
    const ev = byId.get(id)!;
    for (const p of ev.parents) {
      if (!byId.has(p)) continue;
      indegree.set(id, (indegree.get(id) ?? 0) + 1);
      children.get(p)!.push(id);
    }
  }
  for (const id of ids) children.set(id, children.get(id)!.sort(deterministicCompare));
  const ready = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
  const out: string[] = [];
  while (ready.length > 0) {
    ready.sort(deterministicCompare);
    const idx = rand.nextInt(0, ready.length);
    const id = ready.splice(idx, 1)[0]!;
    out.push(id);
    for (const child of children.get(id)!) {
      const next = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, next);
      if (next === 0) ready.push(child);
    }
  }
  if (out.length !== ids.length) throw new Error(`generateValidTopologicalPermutation: cycle seed=${seed}`);
  return Object.freeze(out);
}

export function generateAdversarialGraph(config: AdversarialGraphConfig): GeneratedAdversarialGraph {
  const events = generateAdversarialEvents(config);
  const order = generateValidTopologicalPermutation(events, config.seed ^ 0x9e3779b9);
  const graph = graphFromOrderedEvents(events, order);
  return Object.freeze({
    seed: config.seed,
    events,
    graph,
    topologicalOrder: order,
  });
}
