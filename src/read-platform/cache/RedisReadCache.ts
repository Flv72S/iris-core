/**
 * Redis Read Cache — ADAPTER (via delegate)
 * Implementazione Redis della porta ReadCache tramite delegate iniettabile. Nessun import da redis/ioredis.
 */

import type { ReadCache } from './ReadCache';

/**
 * Delegate per operazioni Redis-like: get, set, del.
 * Permette mock e test senza connessione reale.
 */
export interface RedisReadCacheDelegate<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export class RedisReadCache<T> implements ReadCache<T> {
  constructor(private readonly delegate: RedisReadCacheDelegate<T>) {}

  async get(key: string): Promise<T | undefined> {
    const result = await this.delegate.get(key);
    return result === null ? undefined : result;
  }

  async set(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.delegate.set(key, value, ttlMs);
  }

  async delete(key: string): Promise<void> {
    await this.delegate.del(key);
  }
}
