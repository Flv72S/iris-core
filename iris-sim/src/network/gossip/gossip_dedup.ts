export class GossipDedupCache {
  private readonly ttlMs: number;
  private readonly seen = new Map<string, number>(); // messageId -> firstSeenAt
  constructor(args?: { ttlMs?: number }) {
    this.ttlMs = args?.ttlMs ?? 60_000;
  }

  has(messageId: string, now: number): boolean {
    this.gc(now);
    return this.seen.has(messageId);
  }

  add(messageId: string, now: number): void {
    this.gc(now);
    this.seen.set(messageId, now);
  }

  size(now: number): number {
    this.gc(now);
    return this.seen.size;
  }

  private gc(now: number): void {
    for (const [k, t] of this.seen) {
      if (now - t > this.ttlMs) this.seen.delete(k);
    }
  }
}

