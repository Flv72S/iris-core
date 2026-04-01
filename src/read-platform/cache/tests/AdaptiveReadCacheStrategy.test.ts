/**
 * Adaptive Read Cache Strategy — unit test
 * Verifica: SLA con cacheTTLms → cache abilitata + TTL coerente;
 * SLA senza TTL → cache disabilitata; maxStalenessMs basso → TTL adattato; SLA undefined → cache disabilitata.
 */

import { describe, it, expect } from 'vitest';
import { AdaptiveReadCacheStrategy } from '../AdaptiveReadCacheStrategy';
import type { ReadSLA } from '../../../core/read-sla';

describe('AdaptiveReadCacheStrategy', () => {
  const strategy = new AdaptiveReadCacheStrategy();

  it('SLA con cacheTTLms abilita cache e restituisce TTL coerente', () => {
    const sla: ReadSLA = { cacheTTLms: 60_000 };
    const decision = strategy.decide(sla);
    expect(decision.cache).toBe(true);
    expect(decision.ttlMs).toBe(60_000);
    expect(decision.revalidateAfterMs).toBe(30_000);
  });

  it('SLA senza cacheTTLms disabilita cache', () => {
    const sla: ReadSLA = { maxLatencyMs: 100, maxStalenessMs: 5000 };
    const decision = strategy.decide(sla);
    expect(decision.cache).toBe(false);
    expect(decision.ttlMs).toBeUndefined();
  });

  it('SLA con maxStalenessMs basso adatta TTL', () => {
    const sla: ReadSLA = { cacheTTLms: 60_000, maxStalenessMs: 10_000 };
    const decision = strategy.decide(sla);
    expect(decision.cache).toBe(true);
    expect(decision.ttlMs).toBe(10_000);
    expect(decision.revalidateAfterMs).toBe(5_000);
  });

  it('SLA undefined disabilita cache', () => {
    const decision = strategy.decide(undefined);
    expect(decision.cache).toBe(false);
    expect(decision.ttlMs).toBeUndefined();
  });

  it('SLA vuoto disabilita cache', () => {
    const decision = strategy.decide({});
    expect(decision.cache).toBe(false);
  });
});
