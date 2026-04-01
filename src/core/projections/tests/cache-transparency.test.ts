/**
 * Cache Transparency — con e senza cache stesso Read Model
 * Microstep 3.4.3
 */

import { describe, it, expect } from 'vitest';
import type { ThreadReadModel } from '../../queries/read-models/ThreadReadModel';
import type { ThreadWithMessagesReadModel } from '../../queries/read-models/ThreadWithMessagesReadModel';
import type { MessageReadModel } from '../../queries/read-models/MessageReadModel';
import type { MessageWithThreadReadModel } from '../../queries/read-models/MessageWithThreadReadModel';
import { InMemoryCache, CachedThreadReadProjection, CachedMessageReadProjection } from '../cache';

const threadList: ThreadReadModel[] = [
  { id: 't-1', title: 'A', archived: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
];
const threadWithMessages: ThreadWithMessagesReadModel = {
  id: 't-1',
  title: 'A',
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  messages: [{ id: 'm-1', author: 'a', content: 'c', createdAt: '2026-01-01T00:00:00.000Z' }],
};
const messageList: MessageReadModel[] = [
  { id: 'm-1', threadId: 't-1', author: 'a', content: 'c', createdAt: '2026-01-01T00:00:00.000Z' },
];
const messageWithThread: MessageWithThreadReadModel = {
  id: 'm-1',
  content: 'c',
  author: 'a',
  createdAt: '2026-01-01T00:00:00.000Z',
  thread: { id: 't-1', title: 'A', archived: false },
};

describe('Cache Transparency', () => {
  it('Thread: con cache e senza cache ritornano stesso Read Model (findAll)', async () => {
    const inner = {
      findAll: async () => [...threadList],
      getThreadById: async () => null,
      getThreadWithMessages: async () => null,
      projectThreadWithMessages: async () => null,
    };
    const withoutCache = await inner.findAll();
    const cache = new InMemoryCache();
    const withCache = new CachedThreadReadProjection(inner, cache);
    const resultCached = await withCache.findAll();

    expect(resultCached).toEqual(withoutCache);
    expect(JSON.stringify(resultCached)).toBe(JSON.stringify(withoutCache));
    expect(resultCached).toHaveLength(1);
    expect(resultCached[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('Thread: con cache e senza cache ritornano stesso Read Model (getThreadWithMessages)', async () => {
    const inner = {
      findAll: async () => [],
      getThreadById: async () => null,
      getThreadWithMessages: async () => threadWithMessages,
      projectThreadWithMessages: async () => threadWithMessages,
    };
    const withoutCache = await inner.getThreadWithMessages('t-1');
    const cache = new InMemoryCache();
    const withCache = new CachedThreadReadProjection(inner, cache);
    const resultCached = await withCache.getThreadWithMessages('t-1');

    expect(resultCached).toEqual(withoutCache);
    expect(JSON.stringify(resultCached)).toBe(JSON.stringify(withoutCache));
    expect(resultCached?.messages).toHaveLength(1);
    expect(resultCached?.messages[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('Message: con cache e senza cache ritornano stesso Read Model (findByThreadId)', async () => {
    const inner = {
      getMessageById: async () => null,
      findByThreadId: async () => [...messageList],
      getMessageWithThread: async () => null,
      projectMessageWithThread: async () => null,
    };
    const withoutCache = await inner.findByThreadId('t-1');
    const cache = new InMemoryCache();
    const withCache = new CachedMessageReadProjection(inner, cache);
    const resultCached = await withCache.findByThreadId('t-1');

    expect(resultCached).toEqual(withoutCache);
    expect(JSON.stringify(resultCached)).toBe(JSON.stringify(withoutCache));
  });

  it('Message: con cache e senza cache ritornano stesso Read Model (getMessageWithThread)', async () => {
    const inner = {
      getMessageById: async () => null,
      findByThreadId: async () => [],
      getMessageWithThread: async () => messageWithThread,
      projectMessageWithThread: async () => messageWithThread,
    };
    const withoutCache = await inner.getMessageWithThread('m-1');
    const cache = new InMemoryCache();
    const withCache = new CachedMessageReadProjection(inner, cache);
    const resultCached = await withCache.getMessageWithThread('m-1');

    expect(resultCached).toEqual(withoutCache);
    expect(JSON.stringify(resultCached)).toBe(JSON.stringify(withoutCache));
  });

  it('risultato è serializzabile (JSON.stringify) senza perdita', async () => {
    const inner = {
      findAll: async () => [...threadList],
      getThreadById: async () => null,
      getThreadWithMessages: async () => null,
      projectThreadWithMessages: async () => null,
    };
    const cache = new InMemoryCache();
    const cached = new CachedThreadReadProjection(inner, cache);
    const result = await cached.findAll();
    const str = JSON.stringify(result);
    const back = JSON.parse(str) as ThreadReadModel[];

    expect(back).toEqual(result);
    expect(back[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
