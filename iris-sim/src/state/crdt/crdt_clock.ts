import type { LogicalTimestamp } from './crdt_types.js';

export class CRDTLogicalClock {
  private counter: number;
  private readonly nodeId: string;
  constructor(nodeId: string, initialCounter = 0) {
    this.nodeId = nodeId;
    this.counter = initialCounter;
  }

  now(): LogicalTimestamp {
    this.counter += 1;
    return { counter: this.counter, nodeId: this.nodeId };
  }

  observe(ts: LogicalTimestamp): void {
    this.counter = Math.max(this.counter, ts.counter);
  }
}

export function compareLogicalTimestamp(a: LogicalTimestamp, b: LogicalTimestamp): number {
  if (a.counter !== b.counter) return a.counter < b.counter ? -1 : 1;
  if (a.nodeId === b.nodeId) return 0;
  return a.nodeId < b.nodeId ? -1 : 1;
}

