import { createHash } from 'node:crypto';

export interface ReplayGuard {
  isReplay(nodeId: string, nonce: string, timestamp?: number): boolean;
}

type CacheEntry = { firstSeenAt: number };

export class TtlNonceReplayGuard implements ReplayGuard {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly opts: {
      ttlMs: number;
      maxEntries: number;
      now?: () => number;
    } = { ttlMs: 60_000, maxEntries: 10_000, now: Date.now },
  ) {}

  isReplay(nodeId: string, nonce: string): boolean {
    const now = this.opts.now?.() ?? Date.now();
    const key = this.cacheKey(nodeId, nonce);
    const entry = this.cache.get(key);
    if (entry) {
      return true;
    }
    // Evict oldest-ish entries when above cap.
    if (this.cache.size >= this.opts.maxEntries) {
      // O(n log n) eviction is ok for test/deterministic simulation.
      const oldest = [...this.cache.entries()].sort((a, b) => a[1]!.firstSeenAt - b[1]!.firstSeenAt)[0];
      if (oldest) this.cache.delete(oldest[0] as string);
    }
    this.cache.set(key, { firstSeenAt: now });
    // TTL enforcement
    for (const [k, v] of this.cache.entries()) {
      if (now - v.firstSeenAt > this.opts.ttlMs) this.cache.delete(k);
    }
    return false;
  }

  private cacheKey(nodeId: string, nonce: string): string {
    return createHash('sha256').update(`${nodeId}:${nonce}`, 'utf8').digest('hex');
  }
}

