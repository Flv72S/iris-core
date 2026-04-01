/**
 * In-Memory Projection Queue — unit test
 * Verifica: enqueue/dequeue FIFO, comportamento coda vuota, size coerente.
 */

import { describe, it, expect } from 'vitest';
import { THREAD_READ_EVENT_VERSION } from '../../core/read-events';
import { InMemoryProjectionQueue } from '../InMemoryProjectionQueue';

describe('InMemoryProjectionQueue', () => {
  it('enqueue e dequeue rispettano ordine FIFO', () => {
    const queue = new InMemoryProjectionQueue();
    const e1 = {
      type: 'ThreadCreated' as const,
      eventName: 'ThreadCreated' as const,
      eventVersion: THREAD_READ_EVENT_VERSION,
      id: 't-1',
      title: 'T1',
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const e2 = {
      type: 'ThreadCreated' as const,
      eventName: 'ThreadCreated' as const,
      eventVersion: THREAD_READ_EVENT_VERSION,
      id: 't-2',
      title: 'T2',
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    queue.enqueue(e1);
    queue.enqueue(e2);
    expect(queue.dequeue()).toBe(e1);
    expect(queue.dequeue()).toBe(e2);
    expect(queue.dequeue()).toBeUndefined();
  });

  it('dequeue su coda vuota restituisce undefined', () => {
    const queue = new InMemoryProjectionQueue();
    expect(queue.dequeue()).toBeUndefined();
    expect(queue.size()).toBe(0);
  });

  it('size è coerente con enqueue e dequeue', () => {
    const queue = new InMemoryProjectionQueue();
    const e = {
      type: 'ThreadCreated' as const,
      eventName: 'ThreadCreated' as const,
      eventVersion: THREAD_READ_EVENT_VERSION,
      id: 't-1',
      title: 'T',
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(queue.size()).toBe(0);
    queue.enqueue(e);
    expect(queue.size()).toBe(1);
    queue.enqueue(e);
    expect(queue.size()).toBe(2);
    queue.dequeue();
    expect(queue.size()).toBe(1);
    queue.dequeue();
    expect(queue.size()).toBe(0);
  });
});
