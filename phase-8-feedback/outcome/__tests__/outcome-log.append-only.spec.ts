/**
 * Phase 8.1.3 — Append-only integrity tests
 */

import { describe, it, expect } from 'vitest';
import { createActionOutcome } from '../model/outcome.factory';
import { OutcomeLogStore } from '../persistence/outcome-log.store';

const base = {
  id: 'out-1',
  actionIntentId: 'intent-1',
  status: 'SUCCESS' as const,
  source: 'EXECUTION_RUNTIME' as const,
  timestamp: 1000,
};

describe('Outcome log append-only', () => {
  it('append increases length by 1', () => {
    const store = new OutcomeLogStore();
    expect(store.getSnapshot().entries.length).toBe(0);
    store.append(createActionOutcome({ ...base, id: 'out-1' }));
    expect(store.getSnapshot().entries.length).toBe(1);
    store.append(createActionOutcome({ ...base, id: 'out-2' }));
    expect(store.getSnapshot().entries.length).toBe(2);
  });

  it('previous entries are immutable', () => {
    const store = new OutcomeLogStore();
    const o1 = createActionOutcome({ ...base, id: 'out-1' });
    const snap1 = store.append(o1);
    const o2 = createActionOutcome({ ...base, id: 'out-2' });
    const snap2 = store.append(o2);
    expect(snap1.entries.length).toBe(1);
    expect(snap2.entries.length).toBe(2);
    expect(snap2.entries[0]).toBe(snap1.entries[0]);
    expect(snap2.entries[0].outcome.id).toBe('out-1');
    expect(snap2.entries[1].outcome.id).toBe('out-2');
  });

  it('index is monotonically increasing', () => {
    const store = new OutcomeLogStore();
    for (let i = 0; i < 4; i++) {
      store.append(createActionOutcome({ ...base, id: `out-${i}` }));
    }
    const snap = store.getSnapshot();
    snap.entries.forEach((e, i) => expect(e.index).toBe(i));
  });

  it('snapshot is immutable', () => {
    const store = new OutcomeLogStore();
    store.append(createActionOutcome(base));
    const snap = store.getSnapshot();
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.entries)).toBe(true);
    snap.entries.forEach((e) => expect(Object.isFrozen(e)).toBe(true));
  });
});
