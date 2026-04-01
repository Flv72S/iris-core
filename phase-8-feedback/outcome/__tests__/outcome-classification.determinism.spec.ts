/**
 * Phase 8.1.2 — Classification determinism tests
 */

import { describe, it, expect } from 'vitest';
import { createActionOutcome } from '../model/outcome.factory';
import { classifyOutcome } from '../classification/outcome-classification.engine';

const baseInput = {
  id: 'out-1',
  actionIntentId: 'intent-1',
  status: 'SUCCESS' as const,
  source: 'EXECUTION_RUNTIME' as const,
  timestamp: 1000,
};

describe('Outcome classification determinism', () => {
  it('same outcome produces identical classification', () => {
    const outcome = createActionOutcome(baseInput);
    const a = classifyOutcome(outcome);
    const b = classifyOutcome(outcome);
    expect(a).toEqual(b);
    expect(a.deterministicHash).toBe(b.deterministicHash);
  });

  it('hash stable across multiple runs', () => {
    const outcome = createActionOutcome(baseInput);
    const hashes: string[] = [];
    for (let i = 0; i < 5; i++) {
      hashes.push(classifyOutcome(outcome).deterministicHash);
    }
    expect(hashes.every((h) => h === hashes[0])).toBe(true);
  });

  it('deep equality structural', () => {
    const outcome = createActionOutcome(baseInput);
    const a = classifyOutcome(outcome);
    const b = classifyOutcome(outcome);
    expect(a.outcomeId).toBe(b.outcomeId);
    expect(a.semanticClass).toBe(b.semanticClass);
    expect(a.severity).toBe(b.severity);
    expect(a.recoverable).toBe(b.recoverable);
    expect(a.deterministicHash).toBe(b.deterministicHash);
  });

  it('returned object is not mutable', () => {
    const outcome = createActionOutcome(baseInput);
    const c = classifyOutcome(outcome);
    expect(Object.isFrozen(c)).toBe(true);
    expect(() => {
      (c as { outcomeId: string }).outcomeId = 'other';
    }).toThrow();
  });

  it('pure function: same input same output', () => {
    const o1 = createActionOutcome(baseInput);
    const o2 = createActionOutcome({ ...baseInput });
    expect(classifyOutcome(o1)).toEqual(classifyOutcome(o2));
    expect(classifyOutcome(o1).deterministicHash).toBe(classifyOutcome(o2).deterministicHash);
  });
});
