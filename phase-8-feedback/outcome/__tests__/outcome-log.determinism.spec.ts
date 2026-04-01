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

describe('Outcome log determinism', () => {
  it('same sequence produces same finalHash', () => {
    const outcomes = [
      createActionOutcome({ ...base, id: 'a' }),
      createActionOutcome({ ...base, id: 'b' }),
    ];
    const store1 = new OutcomeLogStore();
    outcomes.forEach((o) => store1.append(o));
    const store2 = new OutcomeLogStore();
    outcomes.forEach((o) => store2.append(o));
    expect(store1.getSnapshot().finalHash).toBe(store2.getSnapshot().finalHash);
  });

  it('hash stable across multiple runs', () => {
    const outcomes = [
      createActionOutcome({ ...base, id: 'x' }),
      createActionOutcome({ ...base, id: 'y' }),
    ];
    const hashes: string[] = [];
    for (let run = 0; run < 3; run++) {
      const store = new OutcomeLogStore();
      outcomes.forEach((o) => store.append(o));
      hashes.push(store.getSnapshot().finalHash);
    }
    expect(hashes[0]).toBe(hashes[1]);
    expect(hashes[1]).toBe(hashes[2]);
  });

  it('deep equality of snapshots for same sequence', () => {
    const outcomes = [
      createActionOutcome({ ...base, id: 'p' }),
      createActionOutcome({ ...base, id: 'q' }),
    ];
    const store1 = new OutcomeLogStore();
    outcomes.forEach((o) => store1.append(o));
    const store2 = new OutcomeLogStore();
    outcomes.forEach((o) => store2.append(o));
    const s1 = store1.getSnapshot();
    const s2 = store2.getSnapshot();
    expect(s1.finalHash).toBe(s2.finalHash);
    expect(s1.entries.length).toBe(s2.entries.length);
    s1.entries.forEach((e, i) => {
      expect(e.index).toBe(s2.entries[i].index);
      expect(e.outcome.id).toBe(s2.entries[i].outcome.id);
      expect(e.cumulativeHash).toBe(s2.entries[i].cumulativeHash);
    });
  });
});
