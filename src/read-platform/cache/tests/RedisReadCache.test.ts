/**
 * Redis Read Cache — unit test (mock delegate)
 * Verifica: get/set/delete delegano correttamente; null → undefined; nessuna logica extra.
 */

import { describe, it, expect, vi } from 'vitest';
import { RedisReadCache, type RedisReadCacheDelegate } from '../RedisReadCache';

describe('RedisReadCache', () => {
  it('get delega al delegate e restituisce il valore', async () => {
    const delegate: RedisReadCacheDelegate<string> = {
      get: vi.fn().mockResolvedValue('v1'),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    };
    const cache = new RedisReadCache(delegate);
    expect(await cache.get('k')).toBe('v1');
    expect(delegate.get).toHaveBeenCalledWith('k');
  });

  it('get restituisce undefined se delegate ritorna null', async () => {
    const delegate: RedisReadCacheDelegate<string> = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    };
    const cache = new RedisReadCache(delegate);
    expect(await cache.get('k')).toBeUndefined();
    expect(delegate.get).toHaveBeenCalledWith('k');
  });

  it('set chiama il delegate con key, value e ttlMs', async () => {
    const delegate: RedisReadCacheDelegate<string> = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    };
    const cache = new RedisReadCache(delegate);
    await cache.set('k', 'v', 10_000);
    expect(delegate.set).toHaveBeenCalledWith('k', 'v', 10_000);
  });

  it('set senza ttlMs chiama il delegate con ttlMs undefined', async () => {
    const delegate: RedisReadCacheDelegate<string> = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    };
    const cache = new RedisReadCache(delegate);
    await cache.set('k', 'v');
    expect(delegate.set).toHaveBeenCalledWith('k', 'v', undefined);
  });

  it('delete chiama del sul delegate', async () => {
    const delegate: RedisReadCacheDelegate<string> = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    };
    const cache = new RedisReadCache(delegate);
    await cache.delete('k');
    expect(delegate.del).toHaveBeenCalledWith('k');
  });
});
