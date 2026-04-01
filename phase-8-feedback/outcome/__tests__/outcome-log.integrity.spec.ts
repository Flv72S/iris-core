/**
 * Phase 8.1.3 — Integrity violation tests
 *
 * Modifica manuale, cambio ordine, duplicazione → hash diverso.
 */

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

describe('Outcome log integrity', () => {
  it('manual modification of an outcome yields different hash', () => {
    const outcomes = [
      createActionOutcome({ ...base, id: 'a' }),
      createActionOutcome({ ...base, id: 'b' }),
    ];
    const original = replayOutcomeLog(outcomes);
    const tampered = [
      createActionOutcome({ ...base, id: 'a' }),
      createActionOutcome({ ...base, id: 'b', status: 'FAILED' }),
    ];
    const replayedTampered = replayOutcomeLog(tampered);
    expect(replayedTampered.finalHash).not.toBe(original.finalHash);
  });

  it('changing order yields different hash', () => {
    const o1 = createActionOutcome({ ...base, id: '1' });
    const o2 = createActionOutcome({ ...base, id: '2' });
    const order1 = replayOutcomeLog([o1, o2]);
    const order2 = replayOutcomeLog([o2, o1]);
    expect(order1.finalHash).not.toBe(order2.finalHash);
  });

  it('duplicate entry yields different hash', () => {
    const o = createActionOutcome({ ...base, id: 'only' });
    const single = replayOutcomeLog([o]);
    const duplicated = replayOutcomeLog([o, o]);
    expect(duplicated.finalHash).not.toBe(single.finalHash);
    expect(duplicated.entries.length).toBe(2);
    expect(single.entries.length).toBe(1);
  });

  it('store snapshot finalHash changes when sequence changes', () => {
    const store = new OutcomeLogStore();
    store.append(createActionOutcome({ ...base, id: 'x' }));
    const hash1 = store.getSnapshot().finalHash;
    store.append(createActionOutcome({ ...base, id: 'y' }));
    const hash2 = store.getSnapshot().finalHash;
    expect(hash2).not.toBe(hash1);
  });
});
