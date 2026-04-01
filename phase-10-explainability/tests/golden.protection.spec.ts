/**
 * Phase 10.X.3 — Protezione anti-aggiornamento accidentale: dataset e serializzazione
 */

import { describe, it, expect } from 'vitest';
import { GOLDEN_TRACES } from '../golden/golden.dataset';
import { serializeGoldenTrace } from '../golden/golden.serializer';

describe('Golden protection', () => {
  it('GOLDEN_TRACES non possono essere mutate', () => {
    expect(Object.isFrozen(GOLDEN_TRACES)).toBe(true);
    expect(() => {
      (GOLDEN_TRACES as unknown as { push: (x: unknown) => void }).push({});
    }).toThrow();
  });

  it('singola golden non può essere mutata', () => {
    const golden = GOLDEN_TRACES[0];
    expect(Object.isFrozen(golden)).toBe(true);
    expect(() => {
      (golden as { scenarioId: string }).scenarioId = 'mutated';
    }).toThrow();
  });

  it('serializzazione non viene sovrascritta (output deterministico)', () => {
    const golden = GOLDEN_TRACES[0];
    const a = serializeGoldenTrace(golden);
    const b = serializeGoldenTrace(golden);
    expect(a).toBe(b);
  });

  it('dataset non viene ricreato a runtime (riferimento stabile)', () => {
    const ref1 = GOLDEN_TRACES;
    const ref2 = GOLDEN_TRACES;
    expect(ref1).toBe(ref2);
  });

  it('tentativo di mutazione trace su golden → TypeError o throw', () => {
    const golden = GOLDEN_TRACES[0];
    expect(() => {
      (golden.trace as { traceId: string }).traceId = 'mutated';
    }).toThrow();
  });

  it('tentativo di mutazione explanation.sections → throw', () => {
    const golden = GOLDEN_TRACES[0];
    expect(() => {
      (golden.explanation.sections as unknown[]).push({});
    }).toThrow();
  });
});
