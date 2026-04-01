/**
 * Cache Adapter (In-Memory, Read-Side) — contract tests
 * Microstep 3.4.1
 */

import { describe, it, expect, vi } from 'vitest';
import type { ThreadId, MessageId } from '../../queries/read-models/ids';
import type { ThreadReadModel } from '../../queries/read-models/ThreadReadModel';
import type { MessageReadModel } from '../../queries/read-models/MessageReadModel';
import type { ThreadWithMessagesReadModel } from '../../queries/read-models/ThreadWithMessagesReadModel';
import type { MessageWithThreadReadModel } from '../../queries/read-models/MessageWithThreadReadModel';

import { InMemoryCache } from '../cache/InMemoryCache';
import { CachedThreadReadProjection } from '../cache/CachedThreadReadProjection';
import { CachedMessageReadProjection } from '../cache/CachedMessageReadProjection';

describe('Cache Adapter — contract', () => {
  describe('Cache hit', () => {
    it('stessa chiamata due volte: projection sottostante chiamata una sola volta (thread findAll)', async () => {
      const inner = {
        findAll: vi.fn(async (): Promise<ThreadReadModel[]> => []),
        getThreadById: vi.fn(async () => null),
        getThreadWithMessages: vi.fn(async () => null),
        projectThreadWithMessages: vi.fn(async () => null),
      };
      const cache = new InMemoryCache();
      const cached = new CachedThreadReadProjection(inner, cache);

      await cached.findAll();
      await cached.findAll();

      expect(inner.findAll).toHaveBeenCalledTimes(1);
    });

    it('stessa chiamata due volte: projection sottostante chiamata una sola volta (message getMessageById)', async () => {
      const msg: MessageReadModel = {
        id: 'm-1',
        threadId: 't-1',
        author: 'a',
        content: 'c',
        createdAt: '2025-01-01T00:00:00.000Z',
      };
      const inner = {
        getMessageById: vi.fn(async () => msg),
        findByThreadId: vi.fn(async () => []),
        getMessageWithThread: vi.fn(async () => null),
        projectMessageWithThread: vi.fn(async () => null),
      };
      const cache = new InMemoryCache();
      const cached = new CachedMessageReadProjection(inner, cache);

      await cached.getMessageById('m-1');
      await cached.getMessageById('m-1');

      expect(inner.getMessageById).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache miss', () => {
    it('prima chiamata delega correttamente (thread getThreadById)', async () => {
      const t: ThreadReadModel = {
        id: 't-1',
        title: 'T',
        archived: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      const inner = {
        findAll: vi.fn(async () => []),
        getThreadById: vi.fn(async (id: ThreadId) => (id === 't-1' ? t : null)),
        getThreadWithMessages: vi.fn(async () => null),
        projectThreadWithMessages: vi.fn(async () => null),
      };
      const cache = new InMemoryCache();
      const cached = new CachedThreadReadProjection(inner, cache);

      const out = await cached.getThreadById('t-1');

      expect(inner.getThreadById).toHaveBeenCalledTimes(1);
      expect(inner.getThreadById).toHaveBeenCalledWith('t-1');
      expect(out).toEqual(t);
    });

    it('prima chiamata delega correttamente (message findByThreadId)', async () => {
      const list: MessageReadModel[] = [
        {
          id: 'm-1',
          threadId: 't-1',
          author: 'a',
          content: 'c',
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ];
      const inner = {
        getMessageById: vi.fn(async () => null),
        findByThreadId: vi.fn(async (tid: string) => (tid === 't-1' ? list : [])),
        getMessageWithThread: vi.fn(async () => null),
        projectMessageWithThread: vi.fn(async () => null),
      };
      const cache = new InMemoryCache();
      const cached = new CachedMessageReadProjection(inner, cache);

      const out = await cached.findByThreadId('t-1');

      expect(inner.findByThreadId).toHaveBeenCalledTimes(1);
      expect(inner.findByThreadId).toHaveBeenCalledWith('t-1');
      expect(out).toEqual(list);
    });
  });

  describe('Trasparenza', () => {
    it('output cache === output projection (stessa shape, stesso contenuto)', async () => {
      const twm: ThreadWithMessagesReadModel = {
        id: 't-1',
        title: 'T',
        archived: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        messages: [{ id: 'm-1', author: 'a', content: 'c', createdAt: '2025-01-01T00:00:00.000Z' }],
      };
      const inner = {
        findAll: vi.fn(async () => []),
        getThreadById: vi.fn(async () => null),
        getThreadWithMessages: vi.fn(async () => twm),
        projectThreadWithMessages: vi.fn(async () => twm),
      };
      const cache = new InMemoryCache();
      const cached = new CachedThreadReadProjection(inner, cache);

      const out1 = await cached.getThreadWithMessages('t-1');
      const out2 = await cached.getThreadWithMessages('t-1');

      expect(out1).toEqual(twm);
      expect(out2).toEqual(twm);
      expect(out1).toBe(out2);
    });

    it('output cache === output projection per MessageWithThreadReadModel', async () => {
      const mwt: MessageWithThreadReadModel = {
        id: 'm-1',
        content: 'c',
        author: 'a',
        createdAt: '2025-01-01T00:00:00.000Z',
        thread: { id: 't-1', title: 'T', archived: false },
      };
      const inner = {
        getMessageById: vi.fn(async () => null),
        findByThreadId: vi.fn(async () => []),
        getMessageWithThread: vi.fn(async () => mwt),
        projectMessageWithThread: vi.fn(async () => mwt),
      };
      const cache = new InMemoryCache();
      const cached = new CachedMessageReadProjection(inner, cache);

      const out1 = await cached.getMessageWithThread('m-1');
      const out2 = await cached.getMessageWithThread('m-1');

      expect(out1).toEqual(mwt);
      expect(out2).toEqual(mwt);
      expect(out1).toBe(out2);
    });
  });

  describe('Isolamento', () => {
    it('la cache non importa HTTP / Persistence / Prisma / env', () => {
      const { readFileSync } = require('node:fs');
      const cacheFiles = [
        'src/core/projections/cache/InMemoryCache.ts',
        'src/core/projections/cache/CachedThreadReadProjection.ts',
        'src/core/projections/cache/CachedMessageReadProjection.ts',
      ];
      const violations: string[] = [];

      for (const file of cacheFiles) {
        const content = readFileSync(file, 'utf-8');
        for (const m of content.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
          const spec = m[1];
          if (spec.includes('api') || spec.includes('http')) violations.push(`${file}: ${spec}`);
          if (spec.includes('persistence')) violations.push(`${file}: ${spec}`);
          if (spec.includes('prisma')) violations.push(`${file}: ${spec}`);
        }
        if (/\bprocess\s*\.\s*env\b/.test(content)) violations.push(`${file}: process.env`);
      }

      expect(violations).toEqual([]);
    });
  });
});
