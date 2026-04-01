/**
 * Read Metrics — contract test
 * Verifica: interfaccia importabile, mock compilabile, metodi void e sincroni.
 */

import { describe, it, expect } from 'vitest';
import type { ReadMetrics } from '../ReadMetrics';

describe('ReadMetrics contract', () => {
  it('interfaccia ReadMetrics sia importabile', () => {
    const _ReadMetrics: ReadMetrics = {} as ReadMetrics;
    expect(_ReadMetrics).toBeDefined();
  });

  it('oggetto mock che implementa ReadMetrics compila e puo essere chiamato senza errori', () => {
    const mock: ReadMetrics = {
      onCacheHit: () => {},
      onCacheMiss: () => {},
      onProjectionLag: () => {},
      onReadLatency: () => {},
    };
    mock.onCacheHit({ cacheKey: 'k1', readModel: 'thread' });
    mock.onCacheMiss({ cacheKey: 'k2', readModel: 'message' });
    mock.onProjectionLag({ readModel: 'thread', lagMs: 100 });
    mock.onReadLatency({ readModel: 'message', latencyMs: 50 });
  });

  it('nessun metodo richiede async o Promise', () => {
    const mock: ReadMetrics = {
      onCacheHit: () => {},
      onCacheMiss: () => {},
      onProjectionLag: () => {},
      onReadLatency: () => {},
    };
    const hitRet = mock.onCacheHit({ cacheKey: 'x', readModel: 'r' });
    const missRet = mock.onCacheMiss({ cacheKey: 'x', readModel: 'r' });
    const lagRet = mock.onProjectionLag({ readModel: 'r', lagMs: 1 });
    const latRet = mock.onReadLatency({ readModel: 'r', latencyMs: 1 });
    expect(hitRet).toBeUndefined();
    expect(missRet).toBeUndefined();
    expect(lagRet).toBeUndefined();
    expect(latRet).toBeUndefined();
  });

  it('nessun metodo ritorna valori', () => {
    const mock: ReadMetrics = {
      onCacheHit: () => {},
      onCacheMiss: () => {},
      onProjectionLag: () => {},
      onReadLatency: () => {},
    };
    expect(mock.onCacheHit({ cacheKey: 'a', readModel: 'b' })).toBeUndefined();
    expect(mock.onCacheMiss({ cacheKey: 'a', readModel: 'b' })).toBeUndefined();
    expect(mock.onProjectionLag({ readModel: 'b', lagMs: 0 })).toBeUndefined();
    expect(mock.onReadLatency({ readModel: 'b', latencyMs: 0 })).toBeUndefined();
  });
});
