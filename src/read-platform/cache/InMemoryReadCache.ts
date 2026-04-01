/**
 * InMemory Read Cache — ADAPTER
 * Implementazione in-memory della porta ReadCache. Nessuna logica di decisione, nessuna conoscenza di SLA.
 */

import type { ReadCache } from './ReadCache';

interface Entry<T> {
  value: T;
  expiresAt?: number;
}

export class InMemoryReadCache<T> implements ReadCache<T> {
  private readonly store = new Map<string, Entry<T>>();

  async get(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (entry === undefined) return undefined;
    if (entry.expiresAt !== undefined && Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: T, ttlMs?: number): Promise<void> {
    const expiresAt = ttlMs !== undefined ? Date.now() + ttlMs : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
