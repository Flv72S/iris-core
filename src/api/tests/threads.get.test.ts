/**
 * GET /threads — HTTP Adapter Tests (Fase 1.2 / Microstep 1.2.2 / 3.3.3)
 */

import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import type { ThreadReadModel } from '../../core/queries/read-models/ThreadReadModel';
import { registerThreadListRoutes } from '../http/routes/threads.get';

function isIsoDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toISOString() === value;
}

class ThreadReadProjectionFake {
  public findAllCalls = 0;
  public result: ThreadReadModel[] = [];

  async findAll(): Promise<ThreadReadModel[]> {
    this.findAllCalls += 1;
    return this.result;
  }
}

describe('GET /threads', () => {
  it('1) Lista vuota → 200 OK + threads: []', async () => {
    const projection = new ThreadReadProjectionFake();
    const server = Fastify();
    registerThreadListRoutes(server, { projection });

    const res = await server.inject({
      method: 'GET',
      url: '/threads',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as any;
    expect(Array.isArray(body.threads)).toBe(true);
    expect(body.threads).toEqual([]);
  });

  it('2) Lista con elementi (pre-popolata) → 200 OK + campi serializzati correttamente', async () => {
    const projection = new ThreadReadProjectionFake();
    projection.result = [
      {
        id: 't-1',
        title: 'A',
        archived: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 't-2',
        title: 'B',
        archived: false,
        createdAt: '2026-01-01T00:00:01.000Z',
        updatedAt: '2026-01-01T00:00:01.000Z',
      },
    ];

    const server = Fastify();
    registerThreadListRoutes(server, { projection });

    const res = await server.inject({
      method: 'GET',
      url: '/threads',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as any;
    expect(Array.isArray(body.threads)).toBe(true);
    expect(body.threads.length).toBe(2);

    for (const item of body.threads) {
      expect(typeof item.id).toBe('string');
      expect(typeof item.title).toBe('string');
      expect(typeof item.archived).toBe('boolean');
      expect(isIsoDateString(item.createdAt)).toBe(true);
      expect(isIsoDateString(item.updatedAt)).toBe(true);
    }
  });

  it('3) Isolamento read path: chiama solo findAll() una volta', async () => {
    const projection = new ThreadReadProjectionFake();
    projection.result = [];
    const server = Fastify();
    registerThreadListRoutes(server, { projection });

    const res = await server.inject({
      method: 'GET',
      url: '/threads',
    });

    expect(res.statusCode).toBe(200);
    expect(projection.findAllCalls).toBe(1);
  });
});

