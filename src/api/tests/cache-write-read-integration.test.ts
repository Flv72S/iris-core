/**
 * Write → Read integration: cache invalidation after create
 * Microstep 3.4.2 — deve passare con invalidazione, fallire senza
 */

import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerThreadCreateRoutes } from '../http/routes/threads.post';
import { registerThreadListRoutes } from '../http/routes/threads.get';
import { InMemoryThreadRepository } from '../http/repositories/InMemoryThreadRepository';
import { InMemoryThreadQueryRepository } from '../../persistence/queries/InMemoryThreadQueryRepository';
import { ThreadReadProjectionImpl } from '../../core/projections/impl/ThreadReadProjectionImpl';
import { InMemoryCache, CachedThreadReadProjection } from '../../core/projections/cache';
import { InvalidatingThreadRepository } from '../http/wiring/InvalidatingThreadRepository';

describe('Cache Write → Read integration', () => {
  it('GET → cache hit, POST (Create), GET → cache miss, dati aggiornati', async () => {
    const threadRepo = new InMemoryThreadRepository();
    const threadCache = new InMemoryCache();
    const threadQuery = new InMemoryThreadQueryRepository(threadRepo as any);
    const threadProjectionRaw = new ThreadReadProjectionImpl(threadQuery);
    const threadProjection = new CachedThreadReadProjection(threadProjectionRaw, threadCache);
    const invalidatingThreadRepo = new InvalidatingThreadRepository(threadRepo as any, threadCache);

    const server = Fastify();
    registerThreadListRoutes(server, { projection: threadProjection as any });
    registerThreadCreateRoutes(server, { repo: invalidatingThreadRepo as any });

    const get1 = await server.inject({ method: 'GET', url: '/threads' });
    expect(get1.statusCode).toBe(200);
    const body1 = JSON.parse(get1.body) as { threads: unknown[] };
    expect(body1.threads).toEqual([]);

    const post = await server.inject({
      method: 'POST',
      url: '/threads',
      payload: { id: 'client-id', title: 'Hello' },
      headers: { 'content-type': 'application/json' },
    });
    expect(post.statusCode).toBe(201);

    const get2 = await server.inject({ method: 'GET', url: '/threads' });
    expect(get2.statusCode).toBe(200);
    const body2 = JSON.parse(get2.body) as { threads: { id: string; title: string }[] };
    expect(body2.threads.length).toBe(1);
    expect(body2.threads[0].title).toBe('Hello');
  });

  it('senza invalidazione: secondo GET ritorna cache stantia (lista vuota)', async () => {
    const threadRepo = new InMemoryThreadRepository();
    const threadCache = new InMemoryCache();
    const threadQuery = new InMemoryThreadQueryRepository(threadRepo as any);
    const threadProjectionRaw = new ThreadReadProjectionImpl(threadQuery);
    const threadProjection = new CachedThreadReadProjection(threadProjectionRaw, threadCache);

    const server = Fastify();
    registerThreadListRoutes(server, { projection: threadProjection as any });
    registerThreadCreateRoutes(server, { repo: threadRepo as any });

    const get1 = await server.inject({ method: 'GET', url: '/threads' });
    expect(get1.statusCode).toBe(200);
    const body1 = JSON.parse(get1.body) as { threads: unknown[] };
    expect(body1.threads).toEqual([]);

    const post = await server.inject({
      method: 'POST',
      url: '/threads',
      payload: { id: 'client-id', title: 'Hello' },
      headers: { 'content-type': 'application/json' },
    });
    expect(post.statusCode).toBe(201);

    const get2 = await server.inject({ method: 'GET', url: '/threads' });
    expect(get2.statusCode).toBe(200);
    const body2 = JSON.parse(get2.body) as { threads: unknown[] };
    expect(body2.threads).toEqual([]);
  });
});
