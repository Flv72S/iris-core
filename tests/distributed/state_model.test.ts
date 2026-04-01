import { describe, expect, it } from 'vitest';

import crypto from 'node:crypto';

import { stableStringify } from '../../src/logging/audit';

import {
  areStatesCanonicallyEqual,
  buildStateSnapshot,
  canonicalizeState,
  createInitialState,
  cloneState,
  deterministicCompare,
  hashState,
  normalizeState,
  serializeState,
  validateState,
} from '../../src/distributed/state_model';

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

function mkStateWithInsertOrder(opts: {
  objectKeys: readonly string[];
  payloadKeyOrder: readonly string[];
  versionHash: string;
  eventCount?: number;
}): Parameters<typeof normalizeState>[0] {
  const objects: Record<string, any> = {};
  for (const objectId of opts.objectKeys) {
    const basePayload: Record<string, any> = {};
    // Make payload object insertion order vary.
    for (const pk of opts.payloadKeyOrder) {
      if (pk === 'a') basePayload[pk] = 1;
      if (pk === 'b') basePayload[pk] = { x: 2, y: 3 };
      if (pk === 'c') basePayload[pk] = [10, 20];
    }
    objects[objectId] = {
      objectId,
      type: objectId === 'obj1' ? 'TypeA' : 'TypeB',
      payload: basePayload,
      lastEventId: `evt-${objectId}`,
    };
  }

  return {
    version: { hash: opts.versionHash, eventCount: opts.eventCount ?? 123 },
    objects,
  };
}

function stableDeepEqual(a: unknown, b: unknown): void {
  expect(stableStringify(a)).toBe(stableStringify(b));
}

function collectNonPrimitiveObjectRefs(root: unknown): Set<object> {
  const seen = new Set<object>();
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const v = stack.pop();
    if (v === null || v === undefined) continue;
    if (typeof v !== 'object') continue;
    if (seen.has(v)) continue;
    seen.add(v as object);

    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) stack.push(v[i]!);
      continue;
    }

    for (const k of Reflect.ownKeys(v)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = (v as any)[k];
      if (typeof val === 'object' && val !== null) stack.push(val);
    }
  }
  return seen;
}

function assertNoSharedReferences(...roots: unknown[]): void {
  const sets = roots.map((r) => collectNonPrimitiveObjectRefs(r));
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      for (const obj of sets[i]!) {
        if (sets[j]!.has(obj)) {
          throw new Error('Expected no shared object/array references across layers');
        }
      }
    }
  }
}

describe('16F.6.C Deterministic State Model', () => {
  it('deterministicCompare: equality case returns 0 for canonically identical values', () => {
    const a = { x: 1, y: 2 };
    const b = { y: 2, x: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
    expect(deterministicCompare(a, b)).toBe(0);
  });

  it('deterministicCompare: total ordering is stable across repeated sorts', () => {
    const values = [{ x: 2 }, { x: 1 }, { x: 3 }];
    const sorted1 = [...values].sort(deterministicCompare);
    const sorted2 = [...values].sort(deterministicCompare);
    stableDeepEqual(sorted1, sorted2);
  });

  it('deterministicCompare: canonically equal values remain adjacent after sort', () => {
    const input = [{ a: 1, b: 2 }, { b: 2, a: 1 }, { a: 2 }];
    const sorted = [...input].sort(deterministicCompare);

    let foundAdjacentEqual = false;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (deterministicCompare(sorted[i], sorted[i + 1]) === 0) {
        foundAdjacentEqual = true;
        break;
      }
    }
    expect(foundAdjacentEqual).toBe(true);
  });

  it('deterministicCompare: repeated sorting converges to same order', () => {
    const base = [
      { a: 1, b: 2 },
      { b: 2, a: 1 },
      { a: 2 },
      { z: [2, 1] },
      { z: [1, 2] },
    ] as const;

    let arr = permuteDeterministic(base, 77);
    for (let i = 0; i < 5; i++) {
      arr = [...arr].sort(deterministicCompare);
    }

    const once = [...permuteDeterministic(base, 99)].sort(deterministicCompare);
    stableDeepEqual(arr, once);
  });

  it('deterministic serialization: key / payload insertion order does not matter', () => {
    const s1 = mkStateWithInsertOrder({
      objectKeys: ['obj1', 'obj2'],
      payloadKeyOrder: ['b', 'a', 'c'],
      versionHash: 'sha256-aaa',
    });
    const s2 = mkStateWithInsertOrder({
      objectKeys: ['obj2', 'obj1'],
      payloadKeyOrder: ['c', 'a', 'b'],
      versionHash: 'sha256-bbb',
    });

    expect(serializeState(s1)).toBe(serializeState(s2));
  });

  it('hash stability: sha256 depends on objects only (version.hash excluded)', () => {
    const base = mkStateWithInsertOrder({
      objectKeys: ['obj1', 'obj2'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-wrong-1',
      eventCount: 10,
    });
    const otherHash = mkStateWithInsertOrder({
      objectKeys: ['obj1', 'obj2'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-wrong-2',
      eventCount: 999,
    });

    expect(hashState(base)).toBe(hashState(otherHash));
  });

  it('normalize idempotency: normalizeState is stable under repeated normalization', () => {
    const state = mkStateWithInsertOrder({
      objectKeys: ['obj1', 'obj2'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-any',
      eventCount: 42,
    });
    const n1 = normalizeState(state);
    const n2 = normalizeState(n1);
    stableDeepEqual(n1, n2);
    expect(serializeState(n1)).toBe(serializeState(n2));
    expect(hashState(n1)).toBe(hashState(n2));
  });

  it('Equality independence: areStatesCanonicallyEqual(a,b) equals serializeState(a)===serializeState(b)', () => {
    const a = mkStateWithInsertOrder({
      objectKeys: ['obj1'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-a',
      eventCount: 1,
    });
    const b = mkStateWithInsertOrder({
      objectKeys: ['obj1'],
      payloadKeyOrder: ['c', 'b', 'a'],
      versionHash: 'sha256-b',
      eventCount: 999,
    });
    expect(areStatesCanonicallyEqual(a, b)).toBe(serializeState(a) === serializeState(b));
  });

  it('Hash derivation: hashState(state) = STATE:sha256(serializeState(state))', () => {
    const state = mkStateWithInsertOrder({
      objectKeys: ['obj1', 'obj2'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-any',
      eventCount: 10,
    });
    const serialized = serializeState(state);
    const digest = crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
    expect(hashState(state)).toBe(`STATE:${digest}`);
  });

  it('version independence: hashState ignores version.eventCount', () => {
    const s1 = mkStateWithInsertOrder({
      objectKeys: ['obj1', 'obj2'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-v1',
      eventCount: 10,
    });
    const s2 = mkStateWithInsertOrder({
      objectKeys: ['obj1', 'obj2'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-v2',
      eventCount: 999,
    });
    expect(hashState(s1)).toBe(hashState(s2));
  });

  it('normalize does not affect canonical output', () => {
    const state = mkStateWithInsertOrder({
      objectKeys: ['obj2', 'obj1'],
      payloadKeyOrder: ['c', 'a', 'b'],
      versionHash: 'sha256-any',
      eventCount: 7,
    });
    expect(serializeState(normalizeState(state))).toBe(serializeState(state));
  });

  it('normalize does not affect hash', () => {
    const state = mkStateWithInsertOrder({
      objectKeys: ['obj2', 'obj1'],
      payloadKeyOrder: ['c', 'a', 'b'],
      versionHash: 'sha256-any',
      eventCount: 7,
    });
    expect(hashState(normalizeState(state))).toBe(hashState(state));
  });

  it('immutability: normalizeState deep-freezes canonical state', () => {
    const raw = mkStateWithInsertOrder({
      objectKeys: ['obj1', 'obj2'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-x',
    });
    const norm = normalizeState(raw);

    expect(Object.isFrozen(norm)).toBe(true);
    expect(Object.isFrozen(norm.objects)).toBe(true);
    expect(Object.isFrozen(norm.objects.obj1)).toBe(true);
    expect(Object.isFrozen(norm.objects.obj1.payload)).toBe(true);

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (norm.objects as any).obj1.type = 'HACK';
    }).toThrow();
  });

  it('no shared references across layers: state ↔ normalize ↔ canonicalize', () => {
    const state = mkStateWithInsertOrder({
      objectKeys: ['obj1', 'obj2'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-any',
      eventCount: 3,
    });
    const normalized = normalizeState(state);
    const canonical = canonicalizeState(state);
    assertNoSharedReferences(state, normalized, canonical);
  });

  it('cloneState forbidden in production', () => {
    const state = mkStateWithInsertOrder({
      objectKeys: ['obj1'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-any',
      eventCount: 1,
    });

    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => cloneState(state)).toThrow(/forbidden in production/i);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('snapshot determinism: stableStringify matches under eventIds permutation', () => {
    const s = mkStateWithInsertOrder({
      objectKeys: ['obj1', 'obj2'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-x',
    });
    const events = ['a', 'b', 'c'] as const;
    const snap1 = buildStateSnapshot(s, events);
    const shuffled = permuteDeterministic(events, 99);
    const snap2 = buildStateSnapshot(s, shuffled);
    expect(stableStringify(snap1)).toBe(stableStringify(snap2));
  });

  it('deep canonicalization: canonical forms and canonical equality ignore ordering', () => {
    const s1 = mkStateWithInsertOrder({
      objectKeys: ['obj2', 'obj1'],
      payloadKeyOrder: ['b', 'a', 'c'],
      versionHash: 'sha256-x',
    });
    const s2 = mkStateWithInsertOrder({
      objectKeys: ['obj1', 'obj2'],
      payloadKeyOrder: ['c', 'b', 'a'],
      versionHash: 'sha256-y',
    });

    expect(areStatesCanonicallyEqual(s1, s2)).toBe(true);
    const c1 = canonicalizeState(s1);
    const c2 = canonicalizeState(s2);
    stableDeepEqual(c1, c2);
  });

  it('Canonicalization idempotency: canonicalizeState(canonicalizeState(state)) is stable', () => {
    const state = mkStateWithInsertOrder({
      objectKeys: ['obj2', 'obj1'],
      payloadKeyOrder: ['b', 'a', 'c'],
      versionHash: 'sha256-any',
      eventCount: 3,
    });
    const c1 = canonicalizeState(state);
    const c2 = canonicalizeState(c1 as any);
    expect(c1).not.toBe(c2);
    stableDeepEqual(c1, c2);
    const c3 = canonicalizeState(c2 as any);
    stableDeepEqual(c1, c3);
  });

  it('canonical uniqueness: serialize equality implies canonical deep equality', () => {
    const a = mkStateWithInsertOrder({
      objectKeys: ['obj1', 'obj2'],
      payloadKeyOrder: ['b', 'a', 'c'],
      versionHash: 'sha256-a',
      eventCount: 10,
    });
    const b = mkStateWithInsertOrder({
      objectKeys: ['obj2', 'obj1'],
      payloadKeyOrder: ['c', 'a', 'b'],
      versionHash: 'sha256-b',
      eventCount: 999,
    });
    expect(serializeState(a)).toBe(serializeState(b));
    stableDeepEqual(canonicalizeState(a), canonicalizeState(b));
  });

  it('canonical convergence fixed-point: repeated canonicalization converges immediately', () => {
    const state = mkStateWithInsertOrder({
      objectKeys: ['obj2', 'obj1'],
      payloadKeyOrder: ['c', 'b', 'a'],
      versionHash: 'sha256-any',
      eventCount: 5,
    });
    let current: any = state;
    for (let i = 0; i < 5; i++) {
      current = canonicalizeState(current);
    }
    stableDeepEqual(current, canonicalizeState(state));
  });

  it('input order independence: canonicalize removes insertion-order artifacts', () => {
    const variantA = mkStateWithInsertOrder({
      objectKeys: ['obj1', 'obj2', 'obj3'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-a',
      eventCount: 1,
    });
    const variantB = mkStateWithInsertOrder({
      objectKeys: ['obj3', 'obj2', 'obj1'],
      payloadKeyOrder: ['c', 'b', 'a'],
      versionHash: 'sha256-b',
      eventCount: 99,
    });
    stableDeepEqual(canonicalizeState(variantA), canonicalizeState(variantB));
  });

  it('validation enforcement: forbids undefined values in payload', () => {
    const raw = mkStateWithInsertOrder({
      objectKeys: ['obj1'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-x',
    }) as any;
    raw.objects.obj1.payload = { a: 1, b: undefined };
    expect(() => validateState(raw)).toThrow(/undefined forbidden/i);
  });

  it('validation enforcement: forbids NaN and Infinity', () => {
    const base = mkStateWithInsertOrder({
      objectKeys: ['obj1'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-x',
    }) as any;

    base.objects.obj1.payload = { a: NaN };
    expect(() => validateState(base)).toThrow(/invalid number/i);

    base.objects.obj1.payload = { a: Infinity };
    expect(() => validateState(base)).toThrow(/invalid number/i);
  });

  it('validation enforcement: forbids class instances (Date)', () => {
    const raw = mkStateWithInsertOrder({
      objectKeys: ['obj1'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-x',
    }) as any;
    raw.objects.obj1.payload = { a: new Date('2020-01-01') };
    expect(() => validateState(raw)).toThrow(/non-plain object/i);
  });

  it('strict DeterministicValue validation: rejects Map/Set and class instances', () => {
    const raw = mkStateWithInsertOrder({
      objectKeys: ['obj1'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-x',
      eventCount: 1,
    }) as any;

    raw.objects.obj1.payload = new Map([['k', 1]]);
    expect(() => validateState(raw)).toThrow(/non-plain object/i);

    raw.objects.obj1.payload = new Set([1]);
    expect(() => validateState(raw)).toThrow(/non-plain object/i);

    class Foo {
      x = 1;
    }
    raw.objects.obj1.payload = new Foo();
    expect(() => validateState(raw)).toThrow(/non-plain object/i);
  });

  it('strict DeterministicValue validation: rejects symbol keys', () => {
    const sym = Symbol('s');
    const raw = mkStateWithInsertOrder({
      objectKeys: ['obj1'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-x',
      eventCount: 1,
    }) as any;
    raw.objects.obj1.payload = { a: 1, [sym]: 2 };
    expect(() => validateState(raw)).toThrow(/symbol keys forbidden/i);
  });

  it('strict DeterministicValue validation: rejects hidden non-enumerable properties', () => {
    const raw = mkStateWithInsertOrder({
      objectKeys: ['obj1'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-x',
      eventCount: 1,
    }) as any;

    const obj: any = { a: 1 };
    Object.defineProperty(obj, 'b', { value: 2, enumerable: false });
    raw.objects.obj1.payload = obj;
    expect(() => validateState(raw)).toThrow(/hidden non-enumerable property/i);
  });

  it('strict DeterministicValue validation: rejects prototype-altered objects', () => {
    const raw = mkStateWithInsertOrder({
      objectKeys: ['obj1'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-x',
      eventCount: 1,
    }) as any;
    const obj: any = { a: 1 };
    Object.setPrototypeOf(obj, { z: 1 });
    raw.objects.obj1.payload = obj;
    expect(() => validateState(raw)).toThrow(/non-plain object/i);
  });

  it('strict DeterministicValue validation: rejects prototype-pollution keys', () => {
    const raw = mkStateWithInsertOrder({
      objectKeys: ['obj1'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-x',
      eventCount: 1,
    }) as any;
    const obj: any = {};
    Object.defineProperty(obj, '__proto__', { value: { hacked: true }, enumerable: true });
    raw.objects.obj1.payload = obj;
    expect(() => validateState(raw)).toThrow(/forbidden key/i);
  });

  it('validation enforcement: forbids circular references in payload', () => {
    const raw = mkStateWithInsertOrder({
      objectKeys: ['obj1'],
      payloadKeyOrder: ['a', 'b', 'c'],
      versionHash: 'sha256-x',
    }) as any;
    const v: Record<string, unknown> = { a: 1 };
    v.self = v;
    raw.objects.obj1.payload = v;
    expect(() => validateState(raw)).toThrow(/circular reference/i);
  });

  it('canonical equality: identical canonical serialization implies equality', () => {
    const s1 = mkStateWithInsertOrder({
      objectKeys: ['obj1', 'obj2'],
      payloadKeyOrder: ['b', 'a', 'c'],
      versionHash: 'sha256-1',
    });
    const s2 = mkStateWithInsertOrder({
      objectKeys: ['obj2', 'obj1'],
      payloadKeyOrder: ['c', 'a', 'b'],
      versionHash: 'sha256-2',
    });
    expect(areStatesCanonicallyEqual(s1, s2)).toBe(true);
    expect(areStatesCanonicallyEqual(s1, createInitialState())).toBe(false);
  });

  it('property-based ordering stability: many permutations keep serialization + hash stable', () => {
    const objectKeys = ['obj1', 'obj2', 'obj3'] as const;
    const payloadKeyOrder = ['a', 'b', 'c'] as const;

    const refState = mkStateWithInsertOrder({
      objectKeys,
      payloadKeyOrder,
      versionHash: 'sha256-ref',
    });
    const refSer = serializeState(refState);
    const refHash = hashState(refState);

    for (let seed = 0; seed < 60; seed++) {
      const objOrder = permuteDeterministic(objectKeys, seed + 1);
      const payOrder = permuteDeterministic(payloadKeyOrder, seed + 2);
      const s = mkStateWithInsertOrder({
        objectKeys: objOrder,
        payloadKeyOrder: payOrder,
        versionHash: `sha256-${seed}`,
      });
      expect(serializeState(s)).toBe(refSer);
      expect(hashState(s)).toBe(refHash);
    }
  });
});

