import crypto from 'node:crypto';

import { canonicalizeKeysDeep, stableStringify } from '../logging/audit';

import { deterministicCompare } from './state_model';

export type EventId = string;

export interface Event {
  id: EventId;
  type: string;
  payload: unknown;
  parents: EventId[];
  timestampLogical: number;
  actorId?: string;
}

export interface EventNode {
  event: Event;
  parents: EventId[];
  children: EventId[];
}

function deepFreezeValue<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (value === null || typeof value !== 'object') return value;
  const obj = value as object;
  if (seen.has(obj)) return value;
  seen.add(obj);
  if (Array.isArray(obj)) {
    for (const v of obj) deepFreezeValue(v, seen);
    Object.freeze(obj);
    return value;
  }
  if (!isPlainObject(obj)) {
    throw new Error('deepFreezeValue: non-plain object encountered');
  }
  for (const k of Object.keys(obj).sort(deterministicCompare)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deepFreezeValue((obj as any)[k], seen);
  }
  Object.freeze(obj);
  return value;
}

function assertFiniteInteger(label: string, v: unknown): asserts v is number {
  if (typeof v !== 'number' || !Number.isFinite(v) || Math.floor(v) !== v) {
    throw new Error(`${label} must be a finite integer`);
  }
}

function assertNonEmptyString(label: string, v: unknown): asserts v is string {
  if (typeof v !== 'string' || v.length === 0) throw new Error(`${label} must be a non-empty string`);
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
}

function validateDeterministicPayload(value: unknown, path: string[] = [], inProgress = new WeakSet<object>()): void {
  if (value === undefined) throw new Error(`payload invalid: undefined at ${path.join('.') || '<root>'}`);
  if (value === null) return;
  const t = typeof value;
  if (t === 'string' || t === 'boolean') return;
  if (t === 'number') {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      throw new Error(`payload invalid: non-finite number at ${path.join('.') || '<root>'}`);
    }
    return;
  }
  if (t !== 'object') throw new Error(`payload invalid: unsupported type ${t}`);

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) validateDeterministicPayload(value[i], [...path, String(i)], inProgress);
    return;
  }

  if (!isPlainObject(value)) throw new Error(`payload invalid: non-plain object at ${path.join('.') || '<root>'}`);
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new Error(`payload invalid: symbol keys at ${path.join('.') || '<root>'}`);
  }
  const names = Object.getOwnPropertyNames(value);
  for (const n of names) {
    if (n === '__proto__' || n === 'prototype' || n === 'constructor') {
      throw new Error(`payload invalid: forbidden key '${n}'`);
    }
    if (!Object.prototype.propertyIsEnumerable.call(value, n)) {
      throw new Error(`payload invalid: hidden property '${n}'`);
    }
  }

  if (inProgress.has(value)) throw new Error(`payload invalid: circular reference at ${path.join('.') || '<root>'}`);
  inProgress.add(value);
  try {
    for (const k of Object.keys(value).sort(deterministicCompare)) {
      validateDeterministicPayload(value[k], [...path, k], inProgress);
    }
  } finally {
    inProgress.delete(value);
  }
}

function canonicalizeParents(parents: readonly EventId[]): EventId[] {
  // Parents are a set semantically: unique + deterministic order.
  const uniq = [...new Set(parents)];
  for (const p of uniq) assertNonEmptyString('parents[]', p);
  return uniq.sort(deterministicCompare);
}

export function canonicalizeEvent(event: Event): Event {
  assertNonEmptyString('event.type', event.type);
  assertFiniteInteger('event.timestampLogical', event.timestampLogical);
  if (event.actorId !== undefined) assertNonEmptyString('event.actorId', event.actorId);
  validateDeterministicPayload(event.payload);
  const parents = canonicalizeParents(event.parents);

  const body = canonicalizeKeysDeep({
    id: event.id,
    type: event.type,
    payload: event.payload,
    parents,
    timestampLogical: event.timestampLogical,
    ...(event.actorId !== undefined ? { actorId: event.actorId } : {}),
  }) as Record<string, unknown>;

  return deepFreezeValue({
    id: String(body.id),
    type: String(body.type),
    payload: body.payload,
    parents: [...(body.parents as string[])],
    timestampLogical: Number(body.timestampLogical),
    ...(body.actorId !== undefined ? { actorId: String(body.actorId) } : {}),
  });
}

export function serializeEvent(event: Event): string {
  return stableStringify(canonicalizeEvent(event));
}

export function hashEvent(event: Event): EventId {
  const digest = crypto.createHash('sha256').update(serializeEvent(event), 'utf8').digest('hex');
  return `EVT:${digest}`;
}

export function createEvent(input: {
  type: string;
  payload: unknown;
  parents?: EventId[];
  timestampLogical: number;
  actorId?: string;
}): Event {
  const baseNoId = {
    id: '',
    type: input.type,
    payload: input.payload,
    parents: canonicalizeParents(input.parents ?? []),
    timestampLogical: input.timestampLogical,
    ...(input.actorId !== undefined ? { actorId: input.actorId } : {}),
  };
  const canonicalNoId = canonicalizeEvent(baseNoId);
  const id = hashEvent(canonicalNoId);
  if (canonicalNoId.parents.includes(id)) {
    throw new Error('Event cannot reference itself');
  }
  return deepFreezeValue(canonicalizeEvent({ ...canonicalNoId, id }));
}

export class EventGraph {
  private nodes: Map<EventId, EventNode>;

  constructor() {
    this.nodes = new Map();
  }

  getNode(id: EventId): EventNode | undefined {
    return this.nodes.get(id);
  }

  has(id: EventId): boolean {
    return this.nodes.has(id);
  }

  addEvent(event: Event): void {
    const c = canonicalizeEvent(event);
    const expectedId = hashEvent({ ...c, id: '' });
    if (event.id !== expectedId) throw new Error('Invalid event id (not canonical)');
    if (stableStringify(event) !== stableStringify(c)) {
      throw new Error('Event is not canonical');
    }
    if (new Set(event.parents).size !== event.parents.length) {
      throw new Error('Duplicate parents not allowed');
    }
    const sortedParents = [...event.parents].sort(deterministicCompare);
    if (stableStringify(sortedParents) !== stableStringify(event.parents)) {
      throw new Error('Parents must be sorted deterministically');
    }
    if (event.parents.includes(event.id)) {
      throw new Error('Event cannot reference itself');
    }

    if (this.nodes.has(c.id)) return;
    for (const p of c.parents) {
      if (!this.nodes.has(p)) throw new Error(`missing parent: ${p}`);
    }

    const node: EventNode = { event: c, parents: [...c.parents], children: [] };
    this.nodes.set(c.id, node);
    for (const p of c.parents) {
      const parent = this.nodes.get(p)!;
      parent.children = [...new Set([...parent.children, c.id])].sort(deterministicCompare);
    }

    if (this.detectCycle(c.id)) {
      // rollback to preserve DAG guarantee
      this.nodes.delete(c.id);
      for (const p of c.parents) {
        const parent = this.nodes.get(p)!;
        parent.children = parent.children.filter((x) => x !== c.id);
      }
      throw new Error('Cycle detected in Event DAG');
    }
  }

  detectCycle(startId: EventId): boolean {
    const visited = new Set<EventId>();
    const inStack = new Set<EventId>();

    const dfs = (id: EventId): boolean => {
      if (inStack.has(id)) return true;
      if (visited.has(id)) return false;
      visited.add(id);
      inStack.add(id);
      const n = this.nodes.get(id);
      if (n !== undefined) {
        for (const child of [...n.children].sort(deterministicCompare)) {
          if (dfs(child)) return true;
        }
      }
      inStack.delete(id);
      return false;
    };

    return dfs(startId);
  }

  ids(): EventId[] {
    return [...this.nodes.keys()].sort(deterministicCompare);
  }
}

export function happensBefore(a: EventId, b: EventId, graph: EventGraph): boolean {
  if (a === b) return false;
  const stack = [b];
  const seen = new Set<EventId>();
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const node = graph.getNode(cur);
    if (!node) continue;
    for (const p of [...node.parents].sort(deterministicCompare)) {
      if (p === a) return true;
      stack.push(p);
    }
  }
  return false;
}

export function topologicalSort(graph: EventGraph): EventId[] {
  const ids = graph.ids();
  const indegree = new Map<EventId, number>();
  for (const id of ids) indegree.set(id, 0);
  for (const id of ids) {
    const n = graph.getNode(id)!;
    for (const child of n.children) {
      indegree.set(child, (indegree.get(child) ?? 0) + 1);
    }
  }

  const ready = ids.filter((id) => (indegree.get(id) ?? 0) === 0).sort(deterministicCompare);
  const out: EventId[] = [];
  while (ready.length > 0) {
    ready.sort(deterministicCompare);
    const id = ready.shift()!;
    out.push(id);
    const n = graph.getNode(id)!;
    for (const child of [...n.children].sort(deterministicCompare)) {
      const next = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, next);
      if (next === 0) ready.push(child);
    }
  }

  if (out.length !== ids.length) throw new Error('Cycle detected in Event DAG');
  return out;
}

