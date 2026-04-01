/**
 * POST /threads — HTTP Adapter Tests (Fase 1.2 / Microstep 1.2.1)
 *
 * Test funzionali (Fastify inject), senza DB/fs/HTTP esterni.
 */

import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import type { Thread } from '../../core/threads/Thread';
import type { ThreadRepository } from '../../core/threads/ThreadRepository';
import { registerThreadCreateRoutes } from '../http/routes/threads.post';

class ThreadRepositoryFake implements ThreadRepository {
  public saveCalls = 0;
  public lastSaved: Thread | null = null;

  async save(thread: Thread): Promise<void> {
    this.saveCalls += 1;
    this.lastSaved = thread;
  }

  async findById(_id: string): Promise<Thread | null> {
    return null;
  }

  async findAll(): Promise<Thread[]> {
    return [];
  }

  async deleteById(_id: string): Promise<void> {
    // idempotente
  }
}

function isIsoDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toISOString() === value;
}

describe('POST /threads', () => {
  it('Happy path: POST valido → 201 + Thread creata', async () => {
    const repo = new ThreadRepositoryFake();
    const server = Fastify();
    registerThreadCreateRoutes(server, { repo });

    const res = await server.inject({
      method: 'POST',
      url: '/threads',
      payload: { id: 'client-id', title: 'Hello' },
      headers: { 'content-type': 'application/json' },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as any;

    expect(typeof body.id).toBe('string');
    expect(body.id.trim().length).toBeGreaterThan(0);
    expect(body.title).toBe('Hello');
    expect(body.archived).toBe(false);
    expect(isIsoDateString(body.createdAt)).toBe(true);
    expect(isIsoDateString(body.updatedAt)).toBe(true);

    const createdAtMs = new Date(body.createdAt).getTime();
    const updatedAtMs = new Date(body.updatedAt).getTime();
    expect(updatedAtMs).toBeGreaterThanOrEqual(createdAtMs);

    expect(repo.saveCalls).toBe(1);
    expect(repo.lastSaved).not.toBeNull();
  });

  it('Input invalido: body mancante/shape errata → 400', async () => {
    const server = Fastify();
    registerThreadCreateRoutes(server);

    const resMissing = await server.inject({
      method: 'POST',
      url: '/threads',
      payload: {},
      headers: { 'content-type': 'application/json' },
    });
    expect(resMissing.statusCode).toBe(400);
  });

  it('Invariante Core violata (title whitespace) → 400', async () => {
    const server = Fastify();
    registerThreadCreateRoutes(server);

    const res = await server.inject({
      method: 'POST',
      url: '/threads',
      payload: { id: 'client-id', title: '   ' },
      headers: { 'content-type': 'application/json' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('Chiama save una sola volta', async () => {
    const repo = new ThreadRepositoryFake();
    const server = Fastify();
    registerThreadCreateRoutes(server, { repo });

    await server.inject({
      method: 'POST',
      url: '/threads',
      payload: { id: 'client-id', title: 'Hello' },
      headers: { 'content-type': 'application/json' },
    });

    expect(repo.saveCalls).toBe(1);
  });
});

