export class GossipRateLimiter {
  private readonly windowMs: number;
  private readonly maxMessagesPerWindow: number;
  private readonly buckets = new Map<string, { windowStart: number; count: number }>();

  constructor(args?: { windowMs?: number; maxMessagesPer10s?: number }) {
    this.windowMs = args?.windowMs ?? 10_000;
    this.maxMessagesPerWindow = args?.maxMessagesPer10s ?? 100;
  }

  allow(peerNodeId: string, now: number): boolean {
    const b = this.buckets.get(peerNodeId);
    if (!b) {
      this.buckets.set(peerNodeId, { windowStart: now, count: 1 });
      return true;
    }
    if (now - b.windowStart >= this.windowMs) {
      b.windowStart = now;
      b.count = 1;
      return true;
    }
    b.count += 1;
    return b.count <= this.maxMessagesPerWindow;
  }
}

