/**
 * Non-Regression: round-trip count con e senza cache
 * Microstep 3.4.3
 */

import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import type { ThreadReadModel } from '../../core/queries/read-models/ThreadReadModel';
import { registerThreadListRoutes } from '../http/routes/threads.get';
import { InMemoryCache, CachedThreadReadProjection } from '../../core/projections/cache';

describe('Cache Non-Regression — Round-Trip Count', () => {
  it('con cache attiva: secondo GET non aumenta chiamate al Query Repository (projection sottostante)', async () => {
    const data: ThreadReadModel[] = [
      { id: 't-1', title: 'T', archived: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    ];
    let findAllCalls = 0;
    const inner = {
      findAll: async (): Promise<ThreadReadModel[]> => {
        findAllCalls += 1;
        return [...data];
      },
      getThreadById: async () => null,
      getThreadWithMessages: async () => null,
      projectThreadWithMessages: async () => null,
    };
    const cache = new InMemoryCache();
    const cached = new CachedThreadReadProjection(inner, cache);

    const server = Fastify();
    registerThreadListRoutes(server, { projection: cached as any });

    await server.inject({ method: 'GET', url: '/threads' });
    expect(findAllCalls).toBe(1);

    await server.inject({ method: 'GET', url: '/threads' });
    expect(findAllCalls).toBe(1);
  });

  it('senza cache: due GET aumentano chiamate (comportamento invariato)', async () => {
    const data: ThreadReadModel[] = [];
    let findAllCalls = 0;
    const inner = {
      findAll: async (): Promise<ThreadReadModel[]> => {
        findAllCalls += 1;
        return [...data];
      },
      getThreadById: async () => null,
      getThreadWithMessages: async () => null,
      projectThreadWithMessages: async () => null,
    };

    const server = Fastify();
    registerThreadListRoutes(server, { projection: inner as any });

    await server.inject({ method: 'GET', url: '/threads' });
    expect(findAllCalls).toBe(1);

    await server.inject({ method: 'GET', url: '/threads' });
    expect(findAllCalls).toBe(2);
  });
});
