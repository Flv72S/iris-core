/**
 * Phase 10.X.2 — Protezione da mutazioni: Golden dataset fisicamente immutabile.
 *
 * Tentativi di mutazione devono causare TypeError (strict mode / freeze).
 */

import { describe, it, expect } from 'vitest';
import { GOLDEN_TRACES } from '../golden/golden.dataset';

describe('Golden dataset immutability', () => {
  it('riassegnazione proprietà su golden lancia o fallisce in strict', () => {
    const golden = GOLDEN_TRACES[0];
    expect(() => {
      (golden as { scenarioId: string }).scenarioId = 'mutated';
    }).toThrow();
  });

  it('push su array GOLDEN_TRACES non possibile', () => {
    expect(Object.isFrozen(GOLDEN_TRACES)).toBe(true);
    expect(() => {
      (GOLDEN_TRACES as unknown as { push: (x: unknown) => number }).push({});
    }).toThrow();
  });

  it('mutazione trace su golden non possibile', () => {
    const golden = GOLDEN_TRACES[0];
    expect(Object.isFrozen(golden.trace)).toBe(true);
    expect(() => {
      (golden.trace as { traceId: string }).traceId = 'mutated';
    }).toThrow();
  });

  it('mutazione explanation.sections non possibile', () => {
    const golden = GOLDEN_TRACES[0];
    expect(Object.isFrozen(golden.explanation.sections)).toBe(true);
    expect(() => {
      (golden.explanation.sections as unknown[]).push({});
    }).toThrow();
  });

  it('mutazione di una sezione non possibile', () => {
    const golden = GOLDEN_TRACES[0];
    const section = golden.explanation.sections[0];
    expect(Object.isFrozen(section)).toBe(true);
    expect(() => {
      (section as { content: string }).content = 'mutated';
    }).toThrow();
  });
});
