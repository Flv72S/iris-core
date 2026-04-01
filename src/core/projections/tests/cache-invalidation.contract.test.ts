/**
 * Cache Invalidation Policy — contract tests
 * Microstep 3.4.2
 */

import { describe, it, expect } from 'vitest';
import { InMemoryCache, buildCacheKey } from '../cache';

describe('Cache Invalidation — contract', () => {
  it('invalidateByKey: rimuove solo la entry specificata, altre intatte', () => {
    const cache = new InMemoryCache();
    cache.set(buildCacheKey('findAll', []), []);
    cache.set(buildCacheKey('getThreadById', ['t-1']), { id: 't-1', title: 'T', archived: false, createdAt: '', updatedAt: '' });
    cache.set(buildCacheKey('getThreadById', ['t-2']), { id: 't-2', title: 'T2', archived: false, createdAt: '', updatedAt: '' });

    cache.invalidateByKey(buildCacheKey('getThreadById', ['t-1']));

    expect(cache.has(buildCacheKey('findAll', []))).toBe(true);
    expect(cache.has(buildCacheKey('getThreadById', ['t-1']))).toBe(false);
    expect(cache.has(buildCacheKey('getThreadById', ['t-2']))).toBe(true);
  });

  it('invalidateByPrefix: rimuove solo le entry con quel prefisso', () => {
    const cache = new InMemoryCache();
    cache.set(buildCacheKey('findAll', []), []);
    cache.set(buildCacheKey('getThreadById', ['t-1']), null);
    cache.set(buildCacheKey('getThreadWithMessages', ['t-1']), null);
    cache.set(buildCacheKey('getMessageById', ['m-1']), null);

    cache.invalidateByPrefix('getThreadById:');

    expect(cache.has(buildCacheKey('findAll', []))).toBe(true);
    expect(cache.has(buildCacheKey('getThreadById', ['t-1']))).toBe(false);
    expect(cache.has(buildCacheKey('getThreadWithMessages', ['t-1']))).toBe(true);
    expect(cache.has(buildCacheKey('getMessageById', ['m-1']))).toBe(true);
  });

  it('invalidateAll: rimuove tutte le entry (solo per test esplicito)', () => {
    const cache = new InMemoryCache();
    cache.set(buildCacheKey('findAll', []), []);
    cache.set(buildCacheKey('getThreadById', ['t-1']), null);

    cache.invalidateAll();

    expect(cache.has(buildCacheKey('findAll', []))).toBe(false);
    expect(cache.has(buildCacheKey('getThreadById', ['t-1']))).toBe(false);
  });
});
