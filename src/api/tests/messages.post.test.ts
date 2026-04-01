import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import type { Message } from '../../core/messages/Message';
import type { MessageRepository } from '../../core/messages/MessageRepository';
import { registerThreadMessageCreateRoutes } from '../http/routes/threads.messages.post';

class MessageRepositoryFake implements MessageRepository {
  public saveCalls = 0;
  public lastSaved: Message | null = null;

  async save(message: Message): Promise<void> {
    this.saveCalls += 1;
    this.lastSaved = message;
  }

  async findByThreadId(_threadId: string): Promise<Message[]> {
    return [];
  }

  async findById(_id: string): Promise<Message | null> {
    return null;
  }
}

function isIsoDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toISOString() === value;
}

describe('POST /threads/:id/messages', () => {
  it('1) Happy path: POST valido → 201 + Message creato', async () => {
    const repo = new MessageRepositoryFake();
    const server = Fastify();
    registerThreadMessageCreateRoutes(server, { repo });

    const res = await server.inject({
      method: 'POST',
      url: '/threads/t-1/messages',
      payload: { author: 'alice', content: 'hello' },
      headers: { 'content-type': 'application/json' },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as any;

    expect(typeof body.id).toBe('string');
    expect(body.id.trim().length).toBeGreaterThan(0);
    expect(body.threadId).toBe('t-1');
    expect(body.author).toBe('alice');
    expect(body.content).toBe('hello');
    expect(isIsoDateString(body.createdAt)).toBe(true);

    expect(repo.saveCalls).toBe(1);
    expect(repo.lastSaved).not.toBeNull();
    expect(repo.lastSaved?.threadId).toBe('t-1');
  });

  it('2) Input invalido (shape): body mancante/shape errata → 400', async () => {
    const server = Fastify();
    registerThreadMessageCreateRoutes(server);

    const resMissing = await server.inject({
      method: 'POST',
      url: '/threads/t-1/messages',
      payload: {},
      headers: { 'content-type': 'application/json' },
    });

    expect(resMissing.statusCode).toBe(400);
  });

  it('3) Invariante (content vuoto/whitespace) → 400', async () => {
    const server = Fastify();
    registerThreadMessageCreateRoutes(server);

    const resEmpty = await server.inject({
      method: 'POST',
      url: '/threads/t-1/messages',
      payload: { author: 'alice', content: '' },
      headers: { 'content-type': 'application/json' },
    });
    expect(resEmpty.statusCode).toBe(400);

    const resWs = await server.inject({
      method: 'POST',
      url: '/threads/t-1/messages',
      payload: { author: 'alice', content: '   ' },
      headers: { 'content-type': 'application/json' },
    });
    expect(resWs.statusCode).toBe(400);
  });

  it('4) No side effects: save chiamato una sola volta', async () => {
    const repo = new MessageRepositoryFake();
    const server = Fastify();
    registerThreadMessageCreateRoutes(server, { repo });

    await server.inject({
      method: 'POST',
      url: '/threads/t-1/messages',
      payload: { author: 'alice', content: 'hello' },
      headers: { 'content-type': 'application/json' },
    });

    expect(repo.saveCalls).toBe(1);
  });
});

