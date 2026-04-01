/**
 * In-Memory Projection Queue — FIFO per Read Events
 * Infrastruttura: accoda e preleva eventi. Nessuna conoscenza di handler o runner.
 */

import type { ThreadReadEvent, MessageReadEvent } from '../core/read-events';

export type ReadEvent = ThreadReadEvent | MessageReadEvent;

/** Coda FIFO di Read Events. */
export class InMemoryProjectionQueue {
  private readonly items: ReadEvent[] = [];

  enqueue(event: ReadEvent): void {
    this.items.push(event);
  }

  dequeue(): ReadEvent | undefined {
    return this.items.shift();
  }

  size(): number {
    return this.items.length;
  }
}
