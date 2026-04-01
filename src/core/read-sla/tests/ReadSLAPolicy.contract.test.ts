/**
 * Read SLA Policy — contract test
 * Verifica: policy restituisce la SLA attesa (selezione deterministica).
 */

import { describe, it, expect } from 'vitest';
import type { ReadSLA } from '../ReadSLA';
import type { ReadSLAPolicy, ReadCriticality, ReadModelSLAPolicy } from '../ReadSLAPolicy';

describe('ReadSLAPolicy', () => {
  it('policy per criticità restituisce la SLA attesa', () => {
    const policy: ReadSLAPolicy = {
      critical: { maxLatencyMs: 50, maxStalenessMs: 1000 },
      standard: { maxLatencyMs: 200, cacheTTLms: 30_000 },
      'best-effort': { maxLatencyMs: 1000 },
    };
    const criticalSla = policy.critical;
    expect(criticalSla).toBeDefined();
    expect(criticalSla?.maxLatencyMs).toBe(50);
    expect(criticalSla?.maxStalenessMs).toBe(1000);

    const standardSla = policy.standard;
    expect(standardSla?.maxLatencyMs).toBe(200);
    expect(standardSla?.cacheTTLms).toBe(30_000);

    const bestEffortSla = policy['best-effort'];
    expect(bestEffortSla?.maxLatencyMs).toBe(1000);
  });

  it('selezione deterministica per chiave', () => {
    const policy: ReadSLAPolicy = {
      standard: { maxLatencyMs: 100 },
    };
    const key: ReadCriticality = 'standard';
    const sla = policy[key];
    expect(sla).toEqual({ maxLatencyMs: 100 });
  });

  it('policy per tipo di read model restituisce SLA attesa', () => {
    const policy: ReadModelSLAPolicy = {
      thread: { maxLatencyMs: 100, cacheTTLms: 10_000 },
      message: { maxLatencyMs: 150, maxStalenessMs: 2000 },
    };
    expect(policy.thread?.maxLatencyMs).toBe(100);
    expect(policy.thread?.cacheTTLms).toBe(10_000);
    expect(policy.message?.maxLatencyMs).toBe(150);
    expect(policy.message?.maxStalenessMs).toBe(2000);
  });
});
