/**
 * GET /threads/:id — HTTP Adapter Tests (Microstep 1.2.3)
 */

import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import type { Thread } from '../../core/threads/Thread';
import type { ThreadRepository } from '../../core/threads/ThreadRepository';
import { InMemoryThreadRepository } from '../http/repositories/InMemoryThreadRepository';
import { registerThreadCreateRoutes } from '../http/routes/threads.post';
import { registerThreadGetByIdRoutes } from '../http/routes/threads.getById';

function isIsoDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toISOString() === value;
}

describe('GET /threads/:id', () => {
  it('1) 200 OK: creo via POST e recupero via GET by id', async () => {
    const innerRepo = new InMemoryThreadRepository();

    // Wrapper per contare le chiamate a save senza creare nuovi repo di produzione
    let saveCalls = 0;
    const repo: ThreadRepository = {
      save: async (thread: Thread) => {
        saveCalls += 1;
        return innerRepo.save(thread);
      },
      findById: async (id: string) => innerRepo.findById(id),
      findAll: async () => innerRepo.findAll(),
      deleteById: async (id: string) => innerRepo.deleteById(id),
    };

    const server = Fastify();
    registerThreadCreateRoutes(server, { repo });
    registerThreadGetByIdRoutes(server, { repo });

    const postRes = await server.inject({
      method: 'POST',
      url: '/threads',
      payload: { id: 'client-id', title: 'Hello' },
      headers: { 'content-type': 'application/json' },
    });
    expect(postRes.statusCode).toBe(201);
    const created = JSON.parse(postRes.body) as any;
    expect(typeof created.id).toBe('string');
    expect(created.id.trim().length).toBeGreaterThan(0);
    expect(created.title).toBe('Hello');

    const getRes = await server.inject({
      method: 'GET',
      url: `/threads/${created.id}`,
    });
    expect(getRes.statusCode).toBe(200);
    const body = JSON.parse(getRes.body) as any;

    expect(body.id).toBe(created.id);
    expect(body.title).toBe('Hello');
    expect(body.archived).toBe(false);
    expect(isIsoDateString(body.createdAt)).toBe(true);
    expect(isIsoDateString(body.updatedAt)).toBe(true);
  });

  it('2) 404 Not Found: id inesistente', async () => {
    const server = Fastify();
    registerThreadGetByIdRoutes(server, { repo: new InMemoryThreadRepository() });

    const res = await server.inject({
      method: 'GET',
      url: '/threads/does-not-exist',
    });

    expect(res.statusCode).toBe(404);
  });

  it('3) Nessuna mutazione: GET by id NON chiama save()', async () => {
    const innerRepo = new InMemoryThreadRepository();

    let saveCalls = 0;
    const repo: ThreadRepository = {
      save: async (thread: Thread) => {
        saveCalls += 1;
        return innerRepo.save(thread);
      },
      findById: async (id: string) => innerRepo.findById(id),
      findAll: async () => innerRepo.findAll(),
      deleteById: async (id: string) => innerRepo.deleteById(id),
    };

    const server = Fastify();
    registerThreadGetByIdRoutes(server, { repo });

    const res = await server.inject({
      method: 'GET',
      url: '/threads/does-not-exist',
    });

    expect(res.statusCode).toBe(404);
    expect(saveCalls).toBe(0);
  });
});

