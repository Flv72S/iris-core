export class SlidingWindowRateLimiter {
  private windowStart = 0;
  private messages = 0;
  private bytes = 0;

  constructor(
    private readonly opts: {
      windowMs: number;
      messagesPerSecond: number;
      bytesPerSecond: number;
      now?: () => number;
    },
  ) {}

  allow(messageBytes: number): boolean {
    const now = this.opts.now?.() ?? Date.now();
    if (this.windowStart === 0) this.windowStart = now;
    if (now - this.windowStart >= this.opts.windowMs) {
      this.windowStart = now;
      this.messages = 0;
      this.bytes = 0;
    }
    const maxMessages = Math.floor((this.opts.messagesPerSecond * this.opts.windowMs) / 1000);
    const maxBytes = Math.floor((this.opts.bytesPerSecond * this.opts.windowMs) / 1000);
    if (this.messages + 1 > maxMessages) return false;
    if (this.bytes + messageBytes > maxBytes) return false;
    this.messages += 1;
    this.bytes += messageBytes;
    return true;
  }
}

