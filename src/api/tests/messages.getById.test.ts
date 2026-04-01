/**
 * GET /messages/:id — HTTP Adapter Tests (Microstep 3.3.3)
 */
import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import type { MessageReadModel } from '../../core/queries/read-models/MessageReadModel';
import { registerMessagesGetByIdRoutes } from '../http/routes/messages.getById';

function isIsoDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toISOString() === value;
}

class MessageReadProjectionFake {
  public getMessageByIdCalls = 0;
  public lastId: string | null = null;
  public resultById = new Map<string, MessageReadModel>();

  async getMessageById(id: string): Promise<MessageReadModel | null> {
    this.getMessageByIdCalls += 1;
    this.lastId = id;
    return this.resultById.get(id) ?? null;
  }
}

describe('GET /messages/:id', () => {
  it('1) Messaggio trovato: 200 OK + campi + createdAt ISO', async () => {
    const projection = new MessageReadProjectionFake();
    projection.resultById.set('m-1', {
      id: 'm-1',
      threadId: 't-1',
      author: 'alice',
      content: 'hello',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const server = Fastify();
    registerMessagesGetByIdRoutes(server, { projection });

    const getRes = await server.inject({
      method: 'GET',
      url: `/messages/m-1`,
    });
    expect(getRes.statusCode).toBe(200);
    const body = JSON.parse(getRes.body) as any;

    expect(body.id).toBe('m-1');
    expect(body.threadId).toBe('t-1');
    expect(body.author).toBe('alice');
    expect(body.content).toBe('hello');
    expect(isIsoDateString(body.createdAt)).toBe(true);
  });

  it('2) Messaggio non trovato: 404 Not Found + errore esplicito', async () => {
    const projection = new MessageReadProjectionFake();
    const server = Fastify();
    registerMessagesGetByIdRoutes(server, { projection });

    const res = await server.inject({
      method: 'GET',
      url: '/messages/does-not-exist',
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ error: 'Message not found' });
  });

  it('3) Interazione projection: getMessageById chiamato una sola volta con id corretto', async () => {
    const projection = new MessageReadProjectionFake();
    const server = Fastify();
    registerMessagesGetByIdRoutes(server, { projection });

    const getRes = await server.inject({
      method: 'GET',
      url: `/messages/m-xyz`,
    });
    expect(getRes.statusCode).toBe(404);
    expect(projection.getMessageByIdCalls).toBe(1);
    expect(projection.lastId).toBe('m-xyz');
  });
});

