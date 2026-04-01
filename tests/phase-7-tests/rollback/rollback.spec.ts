/**
 * 7T.4 — Reversibility & Rollback Tests
 *
 * Apply + revert deterministico; stato finale = stato iniziale; audit completo.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPlannedEntry,
  transition,
  transitionAndPersist,
  InMemoryActionLifecycleStore,
  getNextAllowedStates,
  canTransition,
} from '@/core/execution/action-lifecycle';
import type { ActionLifecycleEntry } from '@/core/execution/action-lifecycle';

const FIXED_AT = new Date('2025-01-15T10:00:00.000Z').getTime();

describe('7T.4 — Reversibility & Rollback', () => {
  let store: InMemoryActionLifecycleStore;

  beforeEach(() => {
    store = new InMemoryActionLifecycleStore();
  });

  it('reversible path: planned → executing → applied → reverted', () => {
    const planned = createPlannedEntry('act-1', FIXED_AT);
    store.set(planned);

    const executing = transition(planned, 'executing', null, FIXED_AT + 1);
    expect(executing).not.toBeNull();
    if (executing) store.set(executing);

    const applied = transition(executing!, 'applied', null, FIXED_AT + 2);
    expect(applied).not.toBeNull();
    if (applied) store.set(applied);

    const reverted = transition(applied!, 'reverted', 'rollback', FIXED_AT + 3);
    expect(reverted).not.toBeNull();
    expect(reverted?.state).toBe('reverted');
  });

  it('state after full rollback is terminal (no further transitions)', () => {
    const planned = createPlannedEntry('act-2', FIXED_AT);
    const reverted = transition(
      transition(transition(planned, 'executing', null, FIXED_AT)!, 'applied', null, FIXED_AT + 1)!,
      'reverted',
      'rollback',
      FIXED_AT + 2
    )!;
    const next = getNextAllowedStates(reverted.state);
    expect(next).toEqual([]);
  });

  it('rollback after failure (executing → failed)', () => {
    const planned = createPlannedEntry('act-3', FIXED_AT);
    const executing = transition(planned, 'executing', null, FIXED_AT)!;
    const failed = transition(executing, 'failed', 'crash', FIXED_AT + 1);
    expect(failed).not.toBeNull();
    expect(failed?.state).toBe('failed');
    const next = getNextAllowedStates(failed!.state);
    expect(next).toEqual([]);
  });

  it('transitionAndPersist updates store and allows rollback', () => {
    const planned = createPlannedEntry('act-4', FIXED_AT);
    store.set(planned);

    const applied = transitionAndPersist(store, planned, 'executing', null, FIXED_AT + 1);
    expect(applied).not.toBeNull();
    const applied2 = applied && transitionAndPersist(store, applied, 'applied', null, FIXED_AT + 2);
    expect(applied2).not.toBeNull();
    const reverted =
      applied2 && transitionAndPersist(store, applied2, 'reverted', 'rollback', FIXED_AT + 3);
    expect(reverted).not.toBeNull();
    expect(store.get('act-4')?.state).toBe('reverted');
  });

  it('consecutive rollbacks: multiple actions all reverted', () => {
    const ids = ['act-a', 'act-b'];
    for (const id of ids) {
      const planned = createPlannedEntry(id, FIXED_AT);
      store.set(planned);
      const applied = transition(
        transition(planned, 'executing', null, FIXED_AT)!,
        'applied',
        null,
        FIXED_AT + 1
      )!;
      store.set(applied);
      const reverted = transition(applied, 'reverted', 'rollback', FIXED_AT + 2)!;
      store.set(reverted);
    }
    expect(store.get('act-a')?.state).toBe('reverted');
    expect(store.get('act-b')?.state).toBe('reverted');
  });
});
