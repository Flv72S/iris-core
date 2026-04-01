/**
 * Message Projection Handler — unit test
 * Verifica: ogni tipo di Read Event produce un Read Model coerente;
 * funzioni pure e deterministiche; nessuna mutazione dell'input.
 */

import { describe, it, expect } from 'vitest';
import { MESSAGE_READ_EVENT_VERSION } from '../../../read-events';
import { projectMessageEvent } from '../MessageProjectionHandler';

describe('MessageProjectionHandler', () => {
  it('MessageAddedReadEvent produce un MessageReadModel coerente', () => {
    const event = {
      type: 'MessageAdded' as const,
      eventName: 'MessageAdded' as const,
      eventVersion: MESSAGE_READ_EVENT_VERSION,
      id: 'm-1',
      threadId: 't-1',
      author: 'alice',
      content: 'Hello',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const model = projectMessageEvent(event);
    expect(model.id).toBe('m-1');
    expect(model.threadId).toBe('t-1');
    expect(model.author).toBe('alice');
    expect(model.content).toBe('Hello');
    expect(model.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(model.removed).toBeUndefined();
  });

  it('MessageUpdatedReadEvent produce un MessageReadModel coerente', () => {
    const event = {
      type: 'MessageUpdated' as const,
      eventName: 'MessageUpdated' as const,
      eventVersion: MESSAGE_READ_EVENT_VERSION,
      id: 'm-1',
      threadId: 't-1',
      content: 'Updated content',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    const model = projectMessageEvent(event);
    expect(model.id).toBe('m-1');
    expect(model.threadId).toBe('t-1');
    expect(model.content).toBe('Updated content');
    expect(model.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('MessageRemovedReadEvent produce un MessageReadModel coerente', () => {
    const event = {
      type: 'MessageRemoved' as const,
      eventName: 'MessageRemoved' as const,
      eventVersion: MESSAGE_READ_EVENT_VERSION,
      id: 'm-1',
      threadId: 't-1',
    };
    const model = projectMessageEvent(event);
    expect(model.id).toBe('m-1');
    expect(model.threadId).toBe('t-1');
    expect(model.removed).toBe(true);
  });

  it('è deterministico: stesso input produce stesso output', () => {
    const event = {
      type: 'MessageAdded' as const,
      eventName: 'MessageAdded' as const,
      eventVersion: MESSAGE_READ_EVENT_VERSION,
      id: 'm-1',
      threadId: 't-1',
      author: 'a',
      content: 'c',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const a = projectMessageEvent(event);
    const b = projectMessageEvent(event);
    expect(a).toEqual(b);
  });

  it('non muta le strutture in input', () => {
    const event = {
      type: 'MessageAdded' as const,
      eventName: 'MessageAdded' as const,
      eventVersion: MESSAGE_READ_EVENT_VERSION,
      id: 'm-1',
      threadId: 't-1',
      author: 'a',
      content: 'c',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const snapshot = { ...event };
    projectMessageEvent(event);
    expect(event).toEqual(snapshot);
  });
});
