/**
 * In-memory key-value cache for Read-Side projections.
 * Key-based, no TTL, read-only usage.
 * Supports invalidation via CacheInvalidator (invalidation policy in wiring).
 */

export interface CacheInvalidator {
  invalidateByKey(key: string): void;
  invalidateByPrefix(prefix: string): void;
  invalidateAll(): void;
}

export class InMemoryCache implements CacheInvalidator {
  private readonly store = new Map<string, unknown>();

  get(key: string): unknown {
    return this.store.get(key);
  }

  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  invalidateByKey(key: string): void {
    this.store.delete(key);
  }

  invalidateByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  invalidateAll(): void {
    this.store.clear();
  }
}
