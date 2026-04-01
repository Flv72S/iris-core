export interface LogicalClock {
  readonly counter: number;
  readonly nodeId: string;
}

function assertClock(clock: LogicalClock): void {
  if (!Number.isFinite(clock.counter) || clock.counter < 0) throw new Error('logicalClock.counter invalid');
  if (clock.nodeId.length === 0) throw new Error('logicalClock.nodeId invalid');
}

export class LogicalClockManager {
  private counter = 0;

  constructor(private readonly nodeId: string) {
    if (nodeId.length === 0) throw new Error('nodeId required');
  }

  tick(): LogicalClock {
    this.counter += 1;
    return Object.freeze({ counter: this.counter, nodeId: this.nodeId });
  }

  merge(remote: LogicalClock): LogicalClock {
    assertClock(remote);
    this.counter = Math.max(this.counter, remote.counter) + 1;
    return Object.freeze({ counter: this.counter, nodeId: this.nodeId });
  }
}
