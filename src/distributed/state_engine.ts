/**
 * 16F.6.C.B.2.bis + .ter — CRDT operational closure with **dominance consistency**:
 * every concurrent pair’s {@link resolveConflict} winner is applied **after** the loser
 * (see {@link topologicalSortDominanceAware}, {@link validateDominanceOrdering}).
 *
 * Merge still uses depth-dominant insertion in `merge_algebra`; evaluation uses a
 * **dominance-aware** Kahn order (dual to merge tie-break semantics on ready queues).
 */
import { canonicalizeKeysDeep, stableStringify } from '../logging/audit';

import { DistributedInputValidationError } from './errors';
import { createEvent, type Event, type EventGraph, type EventId, happensBefore } from './event_model';
import { areEventDagConcurrent, mergeGraphs, resolveConflict } from './merge_algebra';
import { deterministicCompare } from './state_model';

export const IRIS_STATE_ENGINE_OP = 'ir.state.op' as const;

export type EventOperation =
  | { readonly type: 'set'; readonly key: string; readonly value: unknown }
  | { readonly type: 'delete'; readonly key: string };

/**
 * Operational view matching the microstep contract (`id`, `parents`, `op` only).
 * Persisted form is {@link Event} with `type === IRIS_STATE_ENGINE_OP` and payload `{ op }`.
 */
export type CrdtEvent = {
  readonly id: EventId;
  readonly parents: readonly EventId[];
  readonly op: EventOperation;
};

/** Key/value map; values lie in the deterministic JSON-serializable domain. */
export type State = Readonly<Record<string, unknown>>;

export interface EvaluateOptions {
  readonly validateDominance?: boolean;
}

export const EVAL_MODE_STRICT: EvaluateOptions = Object.freeze({ validateDominance: true });
export const EVAL_MODE_FAST: EvaluateOptions = Object.freeze({ validateDominance: false });

function assertNonEmptyString(label: string, v: unknown): asserts v is string {
  if (typeof v !== 'string' || v.length === 0) {
    throw new DistributedInputValidationError(`${label} must be a non-empty string`);
  }
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
}

function validateDeterministicTree(value: unknown, path: string[], inProgress = new WeakSet<object>()): void {
  if (value === undefined) {
    throw new DistributedInputValidationError(`operation value invalid: undefined at ${path.join('.') || '<root>'}`);
  }
  if (value === null) return;
  const t = typeof value;
  if (t === 'string' || t === 'boolean') return;
  if (t === 'number') {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      throw new DistributedInputValidationError(`operation value invalid: non-finite number at ${path.join('.') || '<root>'}`);
    }
    return;
  }
  if (t !== 'object') {
    throw new DistributedInputValidationError(`operation value invalid: unsupported type ${t} at ${path.join('.') || '<root>'}`);
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      validateDeterministicTree(value[i], [...path, String(i)], inProgress);
    }
    return;
  }
  if (!isPlainObject(value)) {
    throw new DistributedInputValidationError(`operation value invalid: non-plain object at ${path.join('.') || '<root>'}`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new DistributedInputValidationError(`operation value invalid: symbol keys at ${path.join('.') || '<root>'}`);
  }
  const names = Object.getOwnPropertyNames(value);
  for (const n of names) {
    if (n === '__proto__' || n === 'prototype' || n === 'constructor') {
      throw new DistributedInputValidationError(`operation value invalid: forbidden key '${n}'`);
    }
    if (!Object.prototype.propertyIsEnumerable.call(value, n)) {
      throw new DistributedInputValidationError(`operation value invalid: hidden property '${n}'`);
    }
  }
  if (inProgress.has(value)) {
    throw new DistributedInputValidationError(`operation value invalid: circular reference at ${path.join('.') || '<root>'}`);
  }
  inProgress.add(value);
  try {
    for (const k of Object.keys(value).sort(deterministicCompare)) {
      validateDeterministicTree(value[k], [...path, k], inProgress);
    }
  } finally {
    inProgress.delete(value);
  }
}

/** Canonical, immutable operation (part of event identity). */
export function canonicalizeEventOperation(op: EventOperation): EventOperation {
  if (op.type === 'set') {
    assertNonEmptyString('op.key', op.key);
    validateDeterministicTree(op.value, ['value']);
    const body = canonicalizeKeysDeep({ type: 'set' as const, key: op.key, value: op.value }) as Record<string, unknown>;
    return Object.freeze({
      type: 'set' as const,
      key: String(body.key),
      value: body.value,
    });
  }
  if (op.type === 'delete') {
    assertNonEmptyString('op.key', op.key);
    return Object.freeze({ type: 'delete' as const, key: op.key });
  }
  throw new DistributedInputValidationError('canonicalizeEventOperation: unknown operation type');
}

export function createStateOpEvent(input: { op: EventOperation; parents?: EventId[] }): Event {
  const cOp = canonicalizeEventOperation(input.op);
  return createEvent({
    type: IRIS_STATE_ENGINE_OP,
    payload: canonicalizeKeysDeep({ op: cOp }),
    parents: input.parents ?? [],
    timestampLogical: 0,
  });
}

export function extractOperation(event: Event): EventOperation {
  if (event.type !== IRIS_STATE_ENGINE_OP) {
    throw new DistributedInputValidationError('extractOperation: not a state engine event', [event.id, event.type]);
  }
  if (!isPlainObject(event.payload)) {
    throw new DistributedInputValidationError('extractOperation: invalid payload', [event.id]);
  }
  const raw = event.payload.op;
  if (!isPlainObject(raw)) {
    throw new DistributedInputValidationError('extractOperation: missing op', [event.id]);
  }
  const t = raw.type;
  if (t === 'set') {
    return canonicalizeEventOperation({
      type: 'set',
      key: raw.key as string,
      value: raw.value,
    });
  }
  if (t === 'delete') {
    return canonicalizeEventOperation({
      type: 'delete',
      key: raw.key as string,
    });
  }
  throw new DistributedInputValidationError('extractOperation: unknown op.type', [event.id, String(t)]);
}

export function eventToCrdtEvent(event: Event): CrdtEvent {
  const op = extractOperation(event);
  return Object.freeze({
    id: event.id,
    parents: Object.freeze([...event.parents]),
    op,
  });
}

function cloneDeepFreeze<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value as object)) {
    throw new DistributedInputValidationError('cloneDeepFreeze: circular reference');
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    seen.set(value as object, out);
    for (const x of value) {
      out.push(cloneDeepFreeze(x as unknown, seen));
    }
    Object.freeze(out);
    return out as T;
  }
  if (!isPlainObject(value)) {
    throw new DistributedInputValidationError('cloneDeepFreeze: non-plain object');
  }
  const out: Record<string, unknown> = {};
  seen.set(value as object, out);
  for (const k of Object.keys(value).sort(deterministicCompare)) {
    out[k] = cloneDeepFreeze(value[k], seen);
  }
  Object.freeze(out);
  return out as T;
}

function freezeStateRecord(base: Record<string, unknown>): State {
  const sortedKeys = Object.keys(base).sort(deterministicCompare);
  const out: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    out[k] = base[k];
  }
  Object.freeze(out);
  return out;
}

const emptyStateSingleton: State = ((): State => {
  const o = Object.create(null) as Record<string, unknown>;
  Object.freeze(o);
  return o;
})();

/** Canonical string for state equality (sorted keys, stable values). */
export function serializeEngineState(state: State): string {
  return stableStringify(state);
}

/**
 * **Dominance (strict):** `a` dominates `b` iff `a` is applied **after** `b` in any dominance-consistent
 * evaluation (causal successor dominates; else {@link resolveConflict} winner dominates loser).
 * Total for distinct events on a DAG.
 */
export function dominates(a: Event, b: Event, graph: EventGraph): boolean {
  if (a.id === b.id) return false;
  if (happensBefore(b.id, a.id, graph)) return true;
  if (happensBefore(a.id, b.id, graph)) return false;
  return resolveConflict(a, b, graph).id === a.id;
}

/**
 * Ready-queue comparator: negative iff `aId` should appear **earlier** in evaluation than `bId`
 * (loser before winner; causal predecessors before successors).
 */
function compareDominanceEvaluationOrder(aId: EventId, bId: EventId, graph: EventGraph): number {
  if (aId === bId) return 0;
  const ea = graph.getNode(aId)!.event;
  const eb = graph.getNode(bId)!.event;
  if (dominates(ea, eb, graph)) return 1;
  if (dominates(eb, ea, graph)) return -1;
  return deterministicCompare(aId, bId);
}

/**
 * Kahn topological sort: among ready nodes, schedule **non-dominant** first so
 * {@link resolveConflict} winners are **last** among concurrent peers (LWW without clocks).
 */
export function topologicalSortDominanceAware(graph: EventGraph): Event[] {
  const ids = graph.ids();
  const indegree = new Map<EventId, number>();
  for (const id of ids) indegree.set(id, 0);
  for (const id of ids) {
    const n = graph.getNode(id)!;
    for (const child of n.children) {
      indegree.set(child, (indegree.get(child) ?? 0) + 1);
    }
  }

  const ready = ids.filter((id) => (indegree.get(id) ?? 0) === 0).sort((x, y) => compareDominanceEvaluationOrder(x, y, graph));
  const out: Event[] = [];
  while (ready.length > 0) {
    ready.sort((x, y) => compareDominanceEvaluationOrder(x, y, graph));
    const id = ready.shift()!;
    out.push(graph.getNode(id)!.event);
    const n = graph.getNode(id)!;
    for (const child of [...n.children].sort(deterministicCompare)) {
      const next = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, next);
      if (next === 0) ready.push(child);
    }
  }

  if (out.length !== ids.length) {
    throw new DistributedInputValidationError('topologicalSortDominanceAware: cycle in Event DAG');
  }
  return out;
}

/**
 * **DOMINANCE CONSISTENCY:** for every concurrent pair, {@link resolveConflict}'s winner appears **after** the loser.
 */
export function validateDominanceOrdering(ordered: readonly Event[], graph: EventGraph): void {
  const idx = new Map<EventId, number>();
  ordered.forEach((e, i) => idx.set(e.id, i));
  const graphIds = graph.ids();
  for (let i = 0; i < graphIds.length; i++) {
    for (let j = i + 1; j < graphIds.length; j++) {
      const ida = graphIds[i]!;
      const idb = graphIds[j]!;
      if (!areEventDagConcurrent(ida, idb, graph)) continue;
      const ea = graph.getNode(ida)!.event;
      const eb = graph.getNode(idb)!.event;
      const winner = resolveConflict(ea, eb, graph);
      const loserId = winner.id === ea.id ? eb.id : ea.id;
      if (idx.get(winner.id)! <= idx.get(loserId)!) {
        throw new DistributedInputValidationError('Dominance violation in evaluation ordering', [
          `winner=${winner.id}`,
          `loser=${loserId}`,
        ]);
      }
    }
  }
}

/** Ids of {@link topologicalSortDominanceAware}; retained for callers that only need `EventId[]`. */
export function topologicalSortForStateEvaluation(graph: EventGraph): EventId[] {
  return topologicalSortDominanceAware(graph).map((e) => e.id);
}

/**
 * Pure fold step: returns a **new** frozen {@link State}; does not mutate `state` or `event`.
 * Structural sharing: unchanged keys keep prior value references where possible.
 */
export function applyEvent(state: State, event: Event): State {
  const op = extractOperation(event);
  if (op.type === 'delete') {
    if (!Object.prototype.hasOwnProperty.call(state, op.key)) {
      return state;
    }
    const next: Record<string, unknown> = { ...state };
    delete next[op.key];
    return freezeStateRecord(next);
  }

  const frozenVal = cloneDeepFreeze(op.value);
  if (Object.prototype.hasOwnProperty.call(state, op.key) && stableStringify(state[op.key]) === stableStringify(frozenVal)) {
    return state;
  }

  const next: Record<string, unknown> = { ...state, [op.key]: frozenVal };
  return freezeStateRecord(next);
}

function assertGraphStateOpsOnly(graph: EventGraph): void {
  for (const id of graph.ids()) {
    const ev = graph.getNode(id)!.event;
    if (ev.type !== IRIS_STATE_ENGINE_OP) {
      throw new DistributedInputValidationError('evaluateGraph: graph contains non-state event', [id, ev.type]);
    }
    extractOperation(ev);
  }
}

/**
 * Deterministic reduction over the DAG: linearize with {@link topologicalSortDominanceAware},
 * then {@link applyEvent}. Dominance verification runs only when `options.validateDominance === true`
 * ({@link evaluateGraphStrict} / {@link EVAL_MODE_STRICT}).
 */
export function evaluateGraph(graph: EventGraph, options?: EvaluateOptions): State {
  assertGraphStateOpsOnly(graph);
  const orderedEvents = topologicalSortDominanceAware(graph);
  if (options?.validateDominance === true) {
    validateDominanceOrdering(orderedEvents, graph);
  }
  let acc: State = emptyStateSingleton;
  for (const ev of orderedEvents) {
    acc = applyEvent(acc, ev);
  }
  return acc;
}

export function evaluateGraphStrict(graph: EventGraph): State {
  return evaluateGraph(graph, EVAL_MODE_STRICT);
}

/** Re-export for call sites that relate evaluation order to merge algebra conflict winners. */
export { mergeGraphs, resolveConflict };
