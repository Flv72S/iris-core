/**
 * Read SLA — contract test
 * Verifica: strutture istanziabili, valori SLA accessibili.
 */

import { describe, it, expect } from 'vitest';
import type { ReadSLA } from '../ReadSLA';

describe('ReadSLA', () => {
  it('è istanziabile con tutte le proprietà opzionali', () => {
    const sla: ReadSLA = {};
    expect(sla).toBeDefined();
    expect(sla.maxLatencyMs).toBeUndefined();
    expect(sla.maxStalenessMs).toBeUndefined();
    expect(sla.cacheTTLms).toBeUndefined();
  });

  it('valori SLA sono accessibili', () => {
    const sla: ReadSLA = {
      maxLatencyMs: 100,
      maxStalenessMs: 5000,
      cacheTTLms: 60_000,
    };
    expect(sla.maxLatencyMs).toBe(100);
    expect(sla.maxStalenessMs).toBe(5000);
    expect(sla.cacheTTLms).toBe(60_000);
  });

  it('accetta solo subset di proprietà', () => {
    const sla: ReadSLA = { maxLatencyMs: 50 };
    expect(sla.maxLatencyMs).toBe(50);
    expect(sla.maxStalenessMs).toBeUndefined();
  });
});
