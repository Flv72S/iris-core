/**
 * Phase 8.1.1 — Determinism tests
 *
 * Stessa input → outcome identico; stesso hash tra run multipli;
 * deep equality strutturale; nessuna mutazione post-creazione.
 */

import { describe, it, expect } from 'vitest';
import { createActionOutcome } from '../model/outcome.factory';

const baseInput = {
  id: 'out-1',
  actionIntentId: 'intent-1',
  status: 'SUCCESS' as const,
  source: 'EXECUTION_RUNTIME' as const,
  timestamp: 1000,
};

describe('Outcome determinism', () => {
  it('same input produces identical outcome', () => {
    const a = createActionOutcome(baseInput);
    const b = createActionOutcome(baseInput);
    expect(a).toEqual(b);
    expect(a.deterministicHash).toBe(b.deterministicHash);
  });

  it('same hash across multiple runs', () => {
    const hashes: string[] = [];
    for (let i = 0; i < 5; i++) {
      const o = createActionOutcome(baseInput);
      hashes.push(o.deterministicHash);
    }
    expect(hashes.every((h) => h === hashes[0])).toBe(true);
  });

  it('deep equality structural', () => {
    const a = createActionOutcome({ ...baseInput, metadata: { k: 'v' } });
    const b = createActionOutcome({ ...baseInput, metadata: { k: 'v' } });
    expect(a).toEqual(b);
    expect(a.metadata).toEqual(b.metadata);
    expect(a.deterministicHash).toBe(b.deterministicHash);
  });

  it('no mutation after creation', () => {
    const o = createActionOutcome(baseInput);
    expect(() => {
      (o as { id: string }).id = 'other';
    }).toThrow();
    expect(() => {
      (o.metadata as Record<string, unknown>)['x'] = 1;
    }).toThrow();
    expect(o.id).toBe('out-1');
    expect(Object.keys(o.metadata).length).toBe(0);
  });
});
