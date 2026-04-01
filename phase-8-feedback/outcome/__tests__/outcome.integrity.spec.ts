/**
 * Phase 8.1.1 — Integrity tests
 *
 * Campi readonly non modificabili; metadata congelato;
 * hash cambia se cambia qualunque campo semantico;
 * serializzazione JSON stabile.
 */

import { describe, it, expect } from 'vitest';
import { createActionOutcome } from '../model/outcome.factory';
import { computeOutcomeHash } from '../model/outcome.hash';

const baseInput = {
  id: 'out-1',
  actionIntentId: 'intent-1',
  status: 'SUCCESS' as const,
  source: 'EXECUTION_RUNTIME' as const,
  timestamp: 1000,
};

describe('Outcome integrity', () => {
  it('readonly fields are not mutable', () => {
    const o = createActionOutcome(baseInput);
    expect(Object.isFrozen(o)).toBe(true);
    expect(Object.isFrozen(o.metadata)).toBe(true);
  });

  it('metadata is frozen', () => {
    const o = createActionOutcome({ ...baseInput, metadata: { a: 1 } });
    expect(Object.isFrozen(o.metadata)).toBe(true);
    expect(() => {
      (o.metadata as Record<string, unknown>)['b'] = 2;
    }).toThrow();
  });

  it('hash changes when any semantic field changes', () => {
    const base = createActionOutcome(baseInput);
    expect(createActionOutcome({ ...baseInput, id: 'out-2' }).deterministicHash).not.toBe(base.deterministicHash);
    expect(createActionOutcome({ ...baseInput, actionIntentId: 'intent-2' }).deterministicHash).not.toBe(base.deterministicHash);
    expect(createActionOutcome({ ...baseInput, status: 'FAILED' }).deterministicHash).not.toBe(base.deterministicHash);
    expect(createActionOutcome({ ...baseInput, source: 'USER_OVERRIDE' }).deterministicHash).not.toBe(base.deterministicHash);
    expect(createActionOutcome({ ...baseInput, timestamp: 2000 }).deterministicHash).not.toBe(base.deterministicHash);
    expect(createActionOutcome({ ...baseInput, metadata: { x: 1 } }).deterministicHash).not.toBe(base.deterministicHash);
  });

  it('stable JSON serialization', () => {
    const o = createActionOutcome({ ...baseInput, metadata: { z: 1, a: 2 } });
    const json1 = JSON.stringify(o);
    const json2 = JSON.stringify(o);
    expect(json1).toBe(json2);
    const parsed = JSON.parse(json1) as Record<string, unknown>;
    expect(parsed.id).toBe(baseInput.id);
    expect(parsed.deterministicHash).toBe(o.deterministicHash);
  });

  it('computeOutcomeHash is deterministic and matches factory', () => {
    const payload = { ...baseInput, metadata: {} };
    const h1 = computeOutcomeHash(payload);
    const h2 = computeOutcomeHash(payload);
    expect(h1).toBe(h2);
    const o = createActionOutcome(baseInput);
    expect(o.deterministicHash).toBe(h1);
  });
});
