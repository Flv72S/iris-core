/**
 * 16F.6.C.FINAL — Deterministic State Model (Execution Layer Foundation — Certified)
 *
 * This module defines how distributed replicated state is represented, validated,
 * normalized, canonicalized, serialized, hashed, and snapshotted in a deterministic,
 * replayable, audit-grade manner.
 *
 * Determinism contract (enforced by construction):
 * - All serialization is `stableStringify(canonicalizeState(state))`.
 * - Hash is `STATE:${sha256(serializeState(state))}`.
 * - Canonical state is `objects ONLY` (version is excluded entirely from canonicalization and hashing).
 * - No hidden execution state; values are limited to the `DeterministicValue` domain.
 */

import crypto from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import { canonicalizeKeysDeep, stableStringify } from '../logging/audit';

export type DeterministicValue =
  | string
  | number
  | boolean
  | null
  | readonly DeterministicValue[]
  | { readonly [key: string]: DeterministicValue };

export interface DistributedState {
  readonly version: StateVersion;
  readonly objects: Readonly<Record<string, StateObject>>;
}

export interface StateObject {
  readonly objectId: string;
  readonly type: string;
  readonly payload: DeterministicValue;
  readonly lastEventId: string;
}

export interface StateVersion {
  readonly hash: string;
  /** Informational only. Must be a finite integer for determinism. */
  readonly eventCount: number;
}

export interface StateSnapshot {
  readonly version: StateVersion;
  readonly state: DistributedState;
  readonly metadata: {
    readonly createdFromEventIds: readonly string[];
    readonly deterministic: true;
  };
}

export type CanonicalState = Readonly<{
  /** Canonical object map; key ordering is deterministic (sorted upstream). */
  readonly objects: Readonly<Record<string, CanonicalStateObject>>;
}>;

export type CanonicalStateObject = Readonly<{
  readonly objectId: string;
  readonly type: string;
  readonly payload: DeterministicValue;
  readonly lastEventId: string;
}>;

class DeterministicStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeterministicStateError';
  }
}

function isPlainObjectPrototype(proto: object | null | undefined): boolean {
  // Hard requirement: Object.getPrototypeOf(obj) must equal Object.prototype.
  return proto === Object.prototype;
}

/**
 * Total deterministic comparator over canonical space.
 * Equality is explicit and collision-safe via canonical serialization.
 */
export function deterministicCompare(a: unknown, b: unknown): number {
  const sa = stableStringify(a);
  const sb = stableStringify(b);
  if (sa === sb) return 0;
  return sa < sb ? -1 : 1;
}

function deepFreeze<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (value === null) return value;
  if (typeof value !== 'object') return value;
  const obj = value as object;
  if (seen.has(obj)) return value;
  seen.add(obj);
  if (Array.isArray(obj)) {
    for (const v of obj) deepFreeze(v, seen);
    Object.freeze(obj);
    return value;
  }
  // Only freeze plain objects (state is expected to be fully declarative)
  const proto = Object.getPrototypeOf(obj);
  if (!isPlainObjectPrototype(proto)) {
    // If it is not a plain object, freezing is still deterministic but should not happen
    // because validation rejects it. Keep it strict to surface unexpected values.
    throw new DeterministicStateError('deepFreeze: non-plain object encountered');
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort(deterministicCompare);
  for (const k of keys) {
    const v = (obj as Record<string, unknown>)[k]!;
    deepFreeze(v, seen);
  }
  Object.freeze(obj);
  return value;
}

function validateFiniteInteger(label: string, v: unknown): asserts v is number {
  if (typeof v !== 'number' || !Number.isFinite(v) || Math.floor(v) !== v) {
    throw new DeterministicStateError(`${label} must be a finite integer`);
  }
}

function validateNonEmptyString(label: string, v: unknown): asserts v is string {
  if (typeof v !== 'string' || v.length === 0) {
    throw new DeterministicStateError(`${label} must be a non-empty string`);
  }
}

function validateDeterministicValue(
  value: unknown,
  path: string[],
  inProgress: WeakSet<object>,
): asserts value is DeterministicValue {
  if (value === undefined) {
    throw new DeterministicStateError(`payload validation: undefined is forbidden at ${path.join('.')}`);
  }
  if (value === null) return;
  const t = typeof value;
  if (t === 'string' || t === 'boolean') return;
  if (t === 'number') {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      throw new DeterministicStateError(`payload validation: invalid number at ${path.join('.')}`);
    }
    return;
  }
  if (t !== 'object') {
    throw new DeterministicStateError(`payload validation: forbidden type at ${path.join('.')}: ${t}`);
  }
  // Object case: arrays or plain objects only.
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      validateDeterministicValue(value[i]!, [...path, String(i)], inProgress);
    }
    return;
  }

  const proto = Object.getPrototypeOf(value);
  if (!isPlainObjectPrototype(proto)) {
    throw new DeterministicStateError(`payload validation: non-plain object at ${path.join('.')}`);
  }

  const obj = value as Record<string, unknown>;

  // Deterministic value hardening:
  // - reject symbol keys
  // - reject hidden properties (non-enumerables)
  // - reject prototype-pollution keys
  const sym = Object.getOwnPropertySymbols(obj);
  if (sym.length > 0) {
    throw new DeterministicStateError(`payload validation: symbol keys forbidden at ${path.join('.')}`);
  }
  const names = Object.getOwnPropertyNames(obj);
  for (const name of names) {
    if (name === '__proto__' || name === 'prototype' || name === 'constructor') {
      throw new DeterministicStateError(`payload validation: forbidden key '${name}' at ${path.join('.')}`);
    }
    if (!Object.prototype.propertyIsEnumerable.call(obj, name)) {
      throw new DeterministicStateError(`payload validation: hidden non-enumerable property '${name}' at ${path.join('.')}`);
    }
  }

  if (inProgress.has(obj as object)) {
    throw new DeterministicStateError(`payload validation: circular reference detected at ${path.join('.')}`);
  }
  inProgress.add(obj as object);
  try {
    const keys = Object.keys(obj).sort(deterministicCompare);
    for (const k of keys) {
      const v = obj[k]!;
      if (v === undefined) {
        throw new DeterministicStateError(`payload validation: undefined forbidden for key '${k}' at ${path.join('.')}`);
      }
      validateDeterministicValue(v, [...path, k], inProgress);
    }
  } finally {
    inProgress.delete(obj as object);
  }
}

function canonicalizeDeterministicValue(value: DeterministicValue): DeterministicValue {
  // Validation is already enforced by validateState; keep canonicalization strict and deterministic.
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    // Numbers must have been validated as finite above; still guard for safety.
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      throw new DeterministicStateError('canonicalizeDeterministicValue: invalid number');
    }
    return value;
  }
  if (Array.isArray(value)) {
    const out = value.map((v) => canonicalizeDeterministicValue(v)) as DeterministicValue[];
    return Object.freeze(out) as readonly DeterministicValue[];
  }

  // Plain object: recursively canonicalize keys in deterministic order.
  const obj = value as Record<string, DeterministicValue>;
  const proto = Object.getPrototypeOf(obj);
  if (!isPlainObjectPrototype(proto)) {
    throw new DeterministicStateError('canonicalizeDeterministicValue: non-plain object');
  }
  const keys = Object.keys(obj).sort(deterministicCompare);
  const out: Record<string, DeterministicValue> = {};
  for (const k of keys) {
    const v = obj[k]!;
    if (v === undefined) {
      throw new DeterministicStateError('canonicalizeDeterministicValue: undefined forbidden');
    }
    out[k] = canonicalizeDeterministicValue(v);
  }
  // canonicalizeKeysDeep is redundant here (we already sort keys), but it ensures
  // canonicalization stays consistent with the audit stack semantics.
  return deepFreeze(canonicalizeKeysDeep(out) as DeterministicValue) as DeterministicValue;
}

function validateAndCanonicalizeStateForCanonical(state: DistributedState): CanonicalState {
  // Canonical state boundary: canonicalization is objects ONLY.
  // NOTE: We intentionally do not inspect or validate `state.version` here.
  if (state === null || typeof state !== 'object') {
    throw new DeterministicStateError('state must be an object');
  }
  if (state.objects === null || typeof state.objects !== 'object' || Array.isArray(state.objects)) {
    throw new DeterministicStateError('state.objects must be a record/object');
  }

  const inProgress = new WeakSet<object>();

  const objectKeys = Object.keys(state.objects).sort(deterministicCompare);
  const outObjects: Record<string, CanonicalStateObject> = {};

  for (const objectKey of objectKeys) {
    const obj = state.objects[objectKey];
    if (obj === undefined) {
      throw new DeterministicStateError(`objects['${objectKey}'] must be defined`);
    }
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      throw new DeterministicStateError(`objects['${objectKey}'] must be an object`);
    }
    const proto = Object.getPrototypeOf(obj);
    if (!isPlainObjectPrototype(proto)) {
      throw new DeterministicStateError(`objects['${objectKey}'] must be a plain object`);
    }
    const symKeys = Object.getOwnPropertySymbols(obj);
    if (symKeys.length > 0) {
      throw new DeterministicStateError(`objects['${objectKey}'] symbol keys forbidden`);
    }
    const names = Object.getOwnPropertyNames(obj);
    for (const name of names) {
      if (name === '__proto__' || name === 'prototype' || name === 'constructor') {
        throw new DeterministicStateError(`objects['${objectKey}'] forbidden key '${name}'`);
      }
      if (!Object.prototype.propertyIsEnumerable.call(obj, name)) {
        throw new DeterministicStateError(`objects['${objectKey}'] hidden non-enumerable property '${name}'`);
      }
    }
    validateNonEmptyString(`objects['${objectKey}'].objectId`, obj.objectId);
    validateNonEmptyString(`objects['${objectKey}'].type`, obj.type);
    validateNonEmptyString(`objects['${objectKey}'].lastEventId`, obj.lastEventId);
    if (obj.objectId !== objectKey) {
      // Canonicality rule: `objects` key must equal `objectId` field to avoid ambiguity.
      throw new DeterministicStateError(`objects key '${objectKey}' must equal objectId '${obj.objectId}'`);
    }

    validateDeterministicValue(obj.payload, [`objects['${objectKey}'].payload`], inProgress);
    const payloadCanonical = canonicalizeDeterministicValue(obj.payload);
    outObjects[objectKey] = deepFreeze({
      objectId: obj.objectId,
      type: obj.type,
      payload: payloadCanonical,
      lastEventId: obj.lastEventId,
    });
  }

  return deepFreeze({ objects: outObjects }) as CanonicalState;
}

function validateStateVersionOnly(version: unknown): asserts version is StateVersion {
  if (version === null || typeof version !== 'object') {
    throw new DeterministicStateError('version must be an object');
  }
  const v = version as Record<string, unknown>;
  if (typeof v.hash !== 'string') {
    throw new DeterministicStateError('version.hash must be a string');
  }
  validateFiniteInteger('version.eventCount', v.eventCount);
}

function validateStateObjectsOnly(objects: unknown): asserts objects is Record<string, StateObject> {
  if (objects === null || typeof objects !== 'object' || Array.isArray(objects)) {
    throw new DeterministicStateError('state.objects must be a record/object');
  }

  const inProgress = new WeakSet<object>();
  for (const objectKey of Object.keys(objects as Record<string, unknown>)) {
    const obj = (objects as Record<string, StateObject>)[objectKey];
    if (obj === undefined) {
      throw new DeterministicStateError(`objects['${objectKey}'] must be defined`);
    }
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      throw new DeterministicStateError(`objects['${objectKey}'] must be an object`);
    }
    const proto = Object.getPrototypeOf(obj);
    if (!isPlainObjectPrototype(proto)) {
      throw new DeterministicStateError(`objects['${objectKey}'] must be a plain object`);
    }
    const symKeys = Object.getOwnPropertySymbols(obj);
    if (symKeys.length > 0) {
      throw new DeterministicStateError(`objects['${objectKey}'] symbol keys forbidden`);
    }
    const names = Object.getOwnPropertyNames(obj);
    for (const name of names) {
      if (name === '__proto__' || name === 'prototype' || name === 'constructor') {
        throw new DeterministicStateError(`objects['${objectKey}'] forbidden key '${name}'`);
      }
      if (!Object.prototype.propertyIsEnumerable.call(obj, name)) {
        throw new DeterministicStateError(`objects['${objectKey}'] hidden non-enumerable property '${name}'`);
      }
    }
    validateNonEmptyString(`objects['${objectKey}'].objectId`, obj.objectId);
    validateNonEmptyString(`objects['${objectKey}'].type`, obj.type);
    validateNonEmptyString(`objects['${objectKey}'].lastEventId`, obj.lastEventId);
    if (obj.objectId !== objectKey) {
      throw new DeterministicStateError(`objects key '${objectKey}' must equal objectId '${obj.objectId}'`);
    }
    validateDeterministicValue(obj.payload, [`objects['${objectKey}'].payload`], inProgress);
  }
}

function cloneDeterministicValuePreserveOrder(value: DeterministicValue): DeterministicValue {
  // Deep clone without canonical sorting (normalizeState MUST NOT reorder).
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return value;
  if (Array.isArray(value)) {
    return value.map((v) => cloneDeterministicValuePreserveOrder(v as DeterministicValue)) as readonly DeterministicValue[];
  }

  const obj = value as Record<string, DeterministicValue>;
  const out: Record<string, DeterministicValue> = {};
  for (const k of Object.keys(obj)) {
    out[k] = cloneDeterministicValuePreserveOrder(obj[k]!);
  }
  return out as { readonly [key: string]: DeterministicValue };
}

function normalizeStateWithEventCount(state: DistributedState, eventCount: number): DistributedState {
  // Validation boundary: validate metadata shape + object payload domain.
  validateFiniteInteger('version.eventCount', eventCount);
  validateStateObjectsOnly(state.objects);

  const clonedObjects: Record<string, StateObject> = {};
  for (const objectKey of Object.keys(state.objects)) {
    const o = state.objects[objectKey]!;
    clonedObjects[objectKey] = {
      objectId: o.objectId,
      type: o.type,
      payload: cloneDeterministicValuePreserveOrder(o.payload),
      lastEventId: o.lastEventId,
    };
  }

  // Version.hash is derived AFTER hashing; it is not part of canonicalization.
  const normalizedWithoutHash: DistributedState = {
    version: { hash: '', eventCount },
    objects: clonedObjects,
  };
  const hash = hashState(normalizedWithoutHash);
  return deepFreeze({ version: { hash, eventCount }, objects: clonedObjects });
}

/**
 * 16F.6.C — Create the deterministic initial state.
 * The returned state is normalized and has a derived `version.hash`.
 */
export function createInitialState(): DistributedState {
  // Hash is derived after hashing (and version.hash is excluded from canonicalization).
  const raw: DistributedState = {
    version: { hash: '', eventCount: 0 },
    objects: Object.freeze({}),
  };
  return normalizeState(raw);
}

/** normalizeState: validation + immutable cloning only (no canonical sorting). */
let normalizeIdempotencyGuard = false;
export function normalizeState(state: DistributedState): DistributedState {
  // normalizeState: validation + immutable cloning only.
  // It MUST NOT reorder keys or canonicalize payload structure.
  validateState(state);
  const normalized = normalizeStateWithEventCount(state, state.version.eventCount);

  // Dev/test only: enforce strong idempotency.
  if (process.env.NODE_ENV !== 'production' && !normalizeIdempotencyGuard) {
    normalizeIdempotencyGuard = true;
    try {
      const n2 = normalizeState(normalized);
      if (!isDeepStrictEqual(n2, normalized)) {
        throw new DeterministicStateError('normalizeState idempotency violated');
      }
    } finally {
      normalizeIdempotencyGuard = false;
    }
  }

  return normalized;
}

/** Validate state deterministic value compliance and structural correctness. */
export function validateState(state: DistributedState): void {
  if (state === null || typeof state !== 'object') {
    throw new DeterministicStateError('state must be an object');
  }
  validateStateVersionOnly(state.version);
  validateStateObjectsOnly(state.objects);
}

/**
 * cloneState is restricted:
 * - allowed only for tests / boundary isolation
 * - forbidden for state transitions in execution paths
 */
export function cloneState(state: DistributedState): DistributedState {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('cloneState is forbidden in production');
  }
  // Deterministic deep clone by reconstructing objects/arrays from canonical payload.
  // NOTE: This is intentionally not used by normalizeState / hashState / serialization paths.
  const canonical = canonicalizeState(state);
  const clonedObjects: Record<string, StateObject> = {};
  for (const k of Object.keys(canonical.objects).sort(deterministicCompare)) {
    const o = canonical.objects[k]!;
    clonedObjects[k] = {
      objectId: o.objectId,
      type: o.type,
      payload: o.payload,
      lastEventId: o.lastEventId,
    };
  }
  const cloned: DistributedState = {
    version: { hash: state.version.hash, eventCount: state.version.eventCount },
    objects: deepFreeze(clonedObjects),
  };
  return deepFreeze(cloned);
}

/**
 * Canonicalize state:
 * CanonicalState is derived from `state.objects` ONLY (version excluded).
 * It performs deterministic ordering and payload canonicalization for serialization.
 *
 * - Sorts object keys deterministically.
 * - Canonicalizes payload recursively to the deterministic value domain.
 */
let canonicalizeIdempotencyGuard = false;
export function canonicalizeState(state: DistributedState): CanonicalState {
  const c1 = validateAndCanonicalizeStateForCanonical(state);
  // Dev/test only: enforce structural idempotency.
  if (process.env.NODE_ENV !== 'production' && !canonicalizeIdempotencyGuard) {
    canonicalizeIdempotencyGuard = true;
    try {
      const c2 = canonicalizeState(c1 as unknown as DistributedState);
      if (!isDeepStrictEqual(c2, c1)) {
        throw new DeterministicStateError('canonicalizeState structural idempotency violated');
      }
    } finally {
      canonicalizeIdempotencyGuard = false;
    }
  }
  return c1;
}

/** Stable canonical serialization only. */
export function serializeState(state: DistributedState): string {
  return stableStringify(canonicalizeState(state));
}

/** Hash derived exclusively from canonical state (objects only). */
export function hashState(state: DistributedState): string {
  const serialized = serializeState(state);
  const digest = crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
  return `STATE:${digest}`;
}

export function buildStateVersion(state: DistributedState, eventCount: number): StateVersion {
  validateFiniteInteger('eventCount', eventCount);
  const hash = hashState(state);
  return { hash, eventCount };
}

function normalizeStateToEventCount(state: DistributedState, eventCount: number): DistributedState {
  return normalizeStateWithEventCount(state, eventCount);
}

/**
 * Recursive metadata canonicalization for snapshot determinism.
 * - Objects: key-sorted recursively
 * - Arrays: recursively canonicalized and deterministically sorted
 * - Primitives: preserved
 */
function canonicalizeMetadataDeep(input: unknown): unknown {
  if (input === null) return null;
  const t = typeof input;
  if (t !== 'object') return input;
  if (Array.isArray(input)) {
    const canon = input.map((v) => canonicalizeMetadataDeep(v));
    return Object.freeze([...canon].sort(deterministicCompare));
  }
  const obj = input as Record<string, unknown>;
  const keys = Object.keys(obj).sort(deterministicCompare);
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    out[k] = canonicalizeMetadataDeep(obj[k]);
  }
  return deepFreeze(out);
}

let snapshotDeterminismGuard = false;
export function buildStateSnapshot(state: DistributedState, eventIds: readonly string[]): StateSnapshot {
  for (const id of eventIds) {
    validateNonEmptyString('eventIds[]', id);
  }
  const sorted = [...eventIds].sort(deterministicCompare);
  const eventCount = sorted.length;
  const normalizedState = normalizeStateToEventCount(state, eventCount);
  const version: StateVersion = { hash: hashState(normalizedState), eventCount };
  const metadata = canonicalizeMetadataDeep({
    createdFromEventIds: [...sorted],
    deterministic: true,
  }) as StateSnapshot['metadata'];

  const snapshot = deepFreeze({
    version,
    state: normalizedState,
    metadata,
  });

  // Dev/test only: snapshot must be invariant under equivalent event-id permutations.
  if (process.env.NODE_ENV !== 'production' && !snapshotDeterminismGuard) {
    snapshotDeterminismGuard = true;
    try {
      const permuted = [...sorted].reverse();
      const snapshot2 = buildStateSnapshot(state, permuted);
      if (stableStringify(snapshot2) !== stableStringify(snapshot)) {
        throw new DeterministicStateError('buildStateSnapshot permutation invariance violated');
      }
    } finally {
      snapshotDeterminismGuard = false;
    }
  }

  return snapshot;
}

/** Canonical equality: compares canonical serialized forms (ignores reference identity). */
export function areStatesCanonicallyEqual(a: DistributedState, b: DistributedState): boolean {
  // Closure: equality is bound to canonical serialization only (hash is derivative).
  return serializeState(a) === serializeState(b);
}

