/**
 * Read Platform Certification — Gate 4.5
 * Verifica che i principali moduli del read-side siano componibili insieme.
 * Nessun side-effect, solo import e composizione.
 */

import { describe, it, expect } from 'vitest';

describe('Read Platform — composability', () => {
  it('cache + strategy + freshness + governance sono componibili', async () => {
    const { InMemoryReadCache } = await import('../cache/InMemoryReadCache');
    const { AdaptiveReadCacheStrategy } = await import('../cache/AdaptiveReadCacheStrategy');
    const { ReadFreshnessGuard } = await import('../freshness/ReadFreshnessGuard');
    const { ReadGovernanceEngine } = await import('../governance/ReadGovernanceEngine');

    const cache = new InMemoryReadCache<string>();
    const strategy = new AdaptiveReadCacheStrategy();
    const freshnessGuard = new ReadFreshnessGuard();
    const engine = new ReadGovernanceEngine<{ value: number }>([]);

    expect(cache).toBeDefined();
    expect(strategy).toBeDefined();
    expect(freshnessGuard).toBeDefined();
    expect(engine).toBeDefined();
  });

  it('metrics + tracing + violation sono componibili', async () => {
    const { ReadMetrics } = await import('../../core/observability/ReadMetrics');
    const { DefaultReadTraceProvider } = await import('../tracing/ReadTraceProvider');
    const {
      InMemoryReadSLAViolationEmitter,
      evaluateAndEmit,
    } = await import('../observability/ReadSLAViolationEmitter');

    const metrics: ReadMetrics = {
      onCacheHit: () => {},
      onCacheMiss: () => {},
      onProjectionLag: () => {},
      onReadLatency: () => {},
    };
    const traceProvider = new DefaultReadTraceProvider();
    const emitter = new InMemoryReadSLAViolationEmitter();

    expect(metrics).toBeDefined();
    expect(traceProvider).toBeDefined();
    expect(emitter).toBeDefined();
    evaluateAndEmit(
      { freshness: { status: 'fresh' }, readModel: 'thread' },
      emitter
    );
    expect(emitter.getEmitted()).toHaveLength(0);
  });
});
