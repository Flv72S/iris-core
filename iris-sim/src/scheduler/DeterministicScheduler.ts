/**
 * S-0 — Deterministic scheduler. Priority queue, stable ordering, no async.
 */

import type { ScheduledEvent, SchedulerSnapshot, SchedulerSnapshotEvent } from './SchedulerTypes.js';
import { DeterministicSchedulerError } from './ScheduledEvent.js';

interface QueueItem {
  event: ScheduledEvent;
  insertionOrder: number;
}

/**
 * Compare by scheduledTick, then priority (higher first), then insertionOrder (lower first).
 */
function compare(a: QueueItem, b: QueueItem): number {
  if (a.event.scheduledTick !== b.event.scheduledTick) {
    return a.event.scheduledTick < b.event.scheduledTick ? -1 : 1;
  }
  if (a.event.priority !== b.event.priority) {
    return b.event.priority - a.event.priority;
  }
  return a.insertionOrder - b.insertionOrder;
}

function heapUp(heap: QueueItem[], index: number): void {
  while (index > 0) {
    const parent = (index - 1) >> 1;
    if (compare(heap[index], heap[parent]) >= 0) break;
    [heap[index], heap[parent]] = [heap[parent], heap[index]];
    index = parent;
  }
}

function heapDown(heap: QueueItem[], index: number): void {
  const n = heap.length;
  while (true) {
    let smallest = index;
    const left = (index << 1) + 1;
    const right = (index << 1) + 2;
    if (left < n && compare(heap[left], heap[smallest]) < 0) smallest = left;
    if (right < n && compare(heap[right], heap[smallest]) < 0) smallest = right;
    if (smallest === index) break;
    [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
    index = smallest;
  }
}

export type OnEventExecuted = (eventId: string, scheduledTick: bigint, executionOrderIndex: number) => void;

export class DeterministicScheduler {
  private readonly _heap: QueueItem[] = [];
  private _insertionOrder: number = 0;
  private _executionOrderIndex: number = 0;
  private _onExecuted: OnEventExecuted | null = null;

  /** Optional callback for trace; called synchronously after each execute(). */
  setOnEventExecuted(cb: OnEventExecuted | null): void {
    this._onExecuted = cb;
  }

  schedule(event: ScheduledEvent): void {
    this._heap.push({ event, insertionOrder: this._insertionOrder++ });
    heapUp(this._heap, this._heap.length - 1);
  }

  /** Runs the single next event (smallest scheduledTick, then priority, then insertion). Returns without effect if queue empty. */
  runNext(): void {
    if (this._heap.length === 0) return;
    const next = this._heap[0];
    this._heap[0] = this._heap[this._heap.length - 1];
    this._heap.pop();
    if (this._heap.length > 0) heapDown(this._heap, 0);
    const orderIndex = this._executionOrderIndex++;
    next.event.execute();
    this._onExecuted?.(next.event.id, next.event.scheduledTick, orderIndex);
  }

  /** Run all events with scheduledTick <= tick. */
  runUntilTick(tick: bigint): void {
    while (this._heap.length > 0 && this._heap[0].event.scheduledTick <= tick) {
      this.runNext();
    }
  }

  /** Run all scheduled events (no tick limit). */
  drain(): void {
    while (this._heap.length > 0) {
      this.runNext();
    }
  }

  clear(): void {
    this._heap.length = 0;
  }

  peekNext(): ScheduledEvent | null {
    return this._heap.length > 0 ? this._heap[0].event : null;
  }

  get executionOrderIndex(): number {
    return this._executionOrderIndex;
  }

  get size(): number {
    return this._heap.length;
  }

  snapshot(): SchedulerSnapshot {
    const events: SchedulerSnapshotEvent[] = this._heap.map((item) => ({
      id: item.event.id,
      scheduledTick: String(item.event.scheduledTick),
      priority: item.event.priority,
      insertionOrder: item.insertionOrder,
    }));
    return Object.freeze({
      events: events.slice().sort((a, b) => {
        const ta = BigInt(a.scheduledTick);
        const tb = BigInt(b.scheduledTick);
        if (ta !== tb) return ta < tb ? -1 : 1;
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.insertionOrder - b.insertionOrder;
      }),
      nextInsertionOrder: this._insertionOrder,
    });
  }

  restore(_snap: SchedulerSnapshot): void {
    throw new DeterministicSchedulerError(
      'RESTORE_NOT_SUPPORTED',
      'Scheduler cannot restore execute() closures; use runtime snapshot instead.',
    );
  }
}
