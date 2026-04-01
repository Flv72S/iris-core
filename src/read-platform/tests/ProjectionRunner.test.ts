/**
 * Projection Runner — unit test
 * Verifica: evento processato, ordering per aggregateId, stesso evento non processato due volte,
 * retry su errore simulato senza crash.
 */

import { describe, it, expect } from 'vitest';
import { THREAD_READ_EVENT_VERSION, MESSAGE_READ_EVENT_VERSION } from '../../core/read-events';
import { projectThreadEvent } from '../../core/projections/handlers/ThreadProjectionHandler';
import { projectMessageEvent } from '../../core/projections/handlers/MessageProjectionHandler';
import { InMemoryProjectionQueue } from '../InMemoryProjectionQueue';
import { ProjectionRunner } from '../ProjectionRunner';

describe('ProjectionRunner', () => {
  it('un evento viene processato', async () => {
    const queue = new InMemoryProjectionQueue();
    const event = {
      type: 'ThreadCreated' as const,
      eventName: 'ThreadCreated' as const,
      eventVersion: THREAD_READ_EVENT_VERSION,
      id: 't-1',
      title: 'T',
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    queue.enqueue(event);
    const runner = new ProjectionRunner(queue, { projectThreadEvent, projectMessageEvent });
    const processed = await runner.processNext();
    expect(processed).toBe(true);
    expect(queue.size()).toBe(0);
  });

  it('ordering rispettato per stesso aggregateId', async () => {
    const queue = new InMemoryProjectionQueue();
    const order: string[] = [];
    const captureThread = (e: Parameters<typeof projectThreadEvent>[0]) => {
      order.push(`thread:${e.id}`);
    };
    const captureMessage = (e: Parameters<typeof projectMessageEvent>[0]) => {
      order.push(`message:${e.id}`);
    };
    const handlers = {
      projectThreadEvent: (e: Parameters<typeof projectThreadEvent>[0]) => {
        captureThread(e);
        return projectThreadEvent(e);
      },
      projectMessageEvent: (e: Parameters<typeof projectMessageEvent>[0]) => {
        captureMessage(e);
        return projectMessageEvent(e);
      },
    };
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
      type: 'MessageAdded' as const,
      eventName: 'MessageAdded' as const,
      eventVersion: MESSAGE_READ_EVENT_VERSION,
      id: 'm-1',
      threadId: 't-1',
      author: 'a',
      content: 'c',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    queue.enqueue(e1);
    queue.enqueue(e2);
    const runner = new ProjectionRunner(queue, handlers);
    await runner.processNext();
    await runner.processNext();
    expect(order).toEqual(['thread:t-1', 'message:m-1']);
  });

  it('stesso evento (stesso type+id) non processato due volte', async () => {
    const queue = new InMemoryProjectionQueue();
    const calls: string[] = [];
    const handlers = {
      projectThreadEvent: (e: Parameters<typeof projectThreadEvent>[0]) => {
        calls.push(`${e.type}:${e.id}`);
        return projectThreadEvent(e);
      },
      projectMessageEvent,
    };
    const event = {
      type: 'ThreadCreated' as const,
      eventName: 'ThreadCreated' as const,
      eventVersion: THREAD_READ_EVENT_VERSION,
      id: 't-1',
      title: 'T',
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    queue.enqueue(event);
    queue.enqueue({ ...event });
    const runner = new ProjectionRunner(queue, handlers);
    await runner.processNext();
    await runner.processNext();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe('ThreadCreated:t-1');
  });

  it('retry su errore simulato senza crash', async () => {
    const queue = new InMemoryProjectionQueue();
    let attempts = 0;
    const handlers = {
      projectThreadEvent: (e: Parameters<typeof projectThreadEvent>[0]) => {
        attempts++;
        if (attempts < 2) throw new Error('simulated');
        return projectThreadEvent(e);
      },
      projectMessageEvent,
    };
    const event = {
      type: 'ThreadCreated' as const,
      eventName: 'ThreadCreated' as const,
      eventVersion: THREAD_READ_EVENT_VERSION,
      id: 't-1',
      title: 'T',
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    queue.enqueue(event);
    const runner = new ProjectionRunner(queue, handlers, { maxRetries: 2 });
    await expect(runner.processNext()).resolves.toBe(true);
    expect(attempts).toBe(2);
  });
});
