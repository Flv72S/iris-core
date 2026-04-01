/**
 * GET /threads/:id/messages — HTTP Adapter Tests (Microstep 3.3.3)
 */
import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import type { MessageReadModel } from '../../core/queries/read-models/MessageReadModel';
import { registerMessagesGetByThreadRoutes } from '../http/routes/messages.getByThread';

function isIsoDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toISOString() === value;
}

class MessageReadProjectionFake {
  public findByThreadIdCalls = 0;
  public lastThreadId: string | null = null;
  public resultByThreadId = new Map<string, MessageReadModel[]>();

  async findByThreadId(threadId: string): Promise<MessageReadModel[]> {
    this.findByThreadIdCalls += 1;
    this.lastThreadId = threadId;
    return this.resultByThreadId.get(threadId) ?? [];
  }
}

describe('GET /threads/:id/messages', () => {
  it('1) Lista vuota → 200 OK + messages: []', async () => {
    const projection = new MessageReadProjectionFake();
    const server = Fastify();
    registerMessagesGetByThreadRoutes(server, { projection });

    const res = await server.inject({
      method: 'GET',
      url: '/threads/t-1/messages',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as any;
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages).toEqual([]);
  });

  it('2) Lista con elementi: restituisce esattamente i messaggi (stesso ordine) + ISO dates', async () => {
    const projection = new MessageReadProjectionFake();
    projection.resultByThreadId.set('t-1', [
      {
        id: 'm-1',
        threadId: 't-1',
        author: 'alice',
        content: 'A',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'm-2',
        threadId: 't-1',
        author: 'bob',
        content: 'B',
        createdAt: '2026-01-01T00:00:01.000Z',
      },
    ]);

    const server = Fastify();
    registerMessagesGetByThreadRoutes(server, { projection });

    const res = await server.inject({
      method: 'GET',
      url: '/threads/t-1/messages',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as any;
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages.length).toBe(2);

    expect(body.messages[0].threadId).toBe('t-1');
    expect(body.messages[0].author).toBe('alice');
    expect(body.messages[0].content).toBe('A');
    expect(isIsoDateString(body.messages[0].createdAt)).toBe(true);

    expect(body.messages[1].threadId).toBe('t-1');
    expect(body.messages[1].author).toBe('bob');
    expect(body.messages[1].content).toBe('B');
    expect(isIsoDateString(body.messages[1].createdAt)).toBe(true);
  });

  it('3) Interazione projection: findByThreadId chiamato una sola volta con threadId corretto', async () => {
    const projection = new MessageReadProjectionFake();
    const server = Fastify();
    registerMessagesGetByThreadRoutes(server, { projection });

    const res = await server.inject({
      method: 'GET',
      url: '/threads/t-1/messages',
    });
    expect(res.statusCode).toBe(200);
    expect(projection.findByThreadIdCalls).toBe(1);
    expect(projection.lastThreadId).toBe('t-1');
  });
});

