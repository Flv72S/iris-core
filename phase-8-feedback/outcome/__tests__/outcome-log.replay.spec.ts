import { describe, it, expect } from 'vitest';
import { createActionOutcome } from '../model/outcome.factory';
import { OutcomeLogStore } from '../persistence/outcome-log.store';
import { replayOutcomeLog } from '../persistence/outcome-log.replay';

const base = {
  id: 'out-1',
  actionIntentId: 'intent-1',
  status: 'SUCCESS' as const,
  source: 'EXECUTION_RUNTIME' as const,
  timestamp: 1000,
};

describe('Outcome log replay', () => {
  it('replay produces snapshot identical to store', () => {
    const outcomes = [
      createActionOutcome({ ...base, id: 'a' }),
      createActionOutcome({ ...base, id: 'b' }),
      createActionOutcome({ ...base, id: 'c' }),
    ];
    const store = new OutcomeLogStore();
    outcomes.forEach((o) => store.append(o));
    const fromStore = store.getSnapshot();
    const fromReplay = replayOutcomeLog(outcomes);
    expect(fromReplay.finalHash).toBe(fromStore.finalHash);
    expect(fromReplay.entries.length).toBe(fromStore.entries.length);
    fromReplay.entries.forEach((e, i) => {
      expect(e.index).toBe(fromStore.entries[i].index);
      expect(e.outcome.id).toBe(fromStore.entries[i].outcome.id);
      expect(e.cumulativeHash).toBe(fromStore.entries[i].cumulativeHash);
    });
  });

  it('replay hash equals original hash', () => {
    const outcomes = [
      createActionOutcome({ ...base, id: 'x' }),
      createActionOutcome({ ...base, id: 'y' }),
    ];
    const store = new OutcomeLogStore();
    outcomes.forEach((o) => store.append(o));
    const replayed = replayOutcomeLog(outcomes);
    expect(replayed.finalHash).toBe(store.getSnapshot().finalHash);
  });

  it('order of outcomes is critical and respected', () => {
    const o1 = createActionOutcome({ ...base, id: 'first' });
    const o2 = createActionOutcome({ ...base, id: 'second' });
    const replayA = replayOutcomeLog([o1, o2]);
    const replayB = replayOutcomeLog([o2, o1]);
    expect(replayA.finalHash).not.toBe(replayB.finalHash);
    expect(replayA.entries[0].outcome.id).toBe('first');
    expect(replayB.entries[0].outcome.id).toBe('second');
  });

  it('empty outcomes produces empty snapshot with initial hash', () => {
    const replayed = replayOutcomeLog([]);
    expect(replayed.entries.length).toBe(0);
    expect(replayed.finalHash).toBeDefined();
  });
});
