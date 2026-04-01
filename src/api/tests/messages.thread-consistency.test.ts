import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';

import { registerThreadCreateRoutes } from '../http/routes/threads.post';
import { registerThreadMessageCreateRoutes } from '../http/routes/threads.messages.post';
import { registerMessagesGetByThreadRoutes } from '../http/routes/messages.getByThread';

import { InMemoryThreadRepository } from '../http/repositories/InMemoryThreadRepository';
import { InMemoryMessageRepository } from '../http/repositories/InMemoryMessageRepository';
import { ConsistentMessageRepository } from '../http/wiring/ConsistentMessageRepository';
import { InMemoryMessageQueryRepository } from '../../persistence/queries/InMemoryMessageQueryRepository';
import { MessageReadProjectionImpl } from '../../core/projections/impl/MessageReadProjectionImpl';

describe('Messages ↔ Threads consistency (wiring)', () => {
  it('1) POST /threads/:id/messages con thread esistente → 201', async () => {
    const threadsRepo = new InMemoryThreadRepository();
    const rawMessagesRepo = new InMemoryMessageRepository();
    const messagesRepo = new ConsistentMessageRepository(rawMessagesRepo as any, threadsRepo as any);

    const server = Fastify();
    registerThreadCreateRoutes(server, { repo: threadsRepo });
    registerThreadMessageCreateRoutes(server, { repo: messagesRepo as any });

    const threadRes = await server.inject({
      method: 'POST',
      url: '/threads',
      payload: { id: 'client-id', title: 'Hello' },
      headers: { 'content-type': 'application/json' },
    });
    expect(threadRes.statusCode).toBe(201);
    const createdThread = JSON.parse(threadRes.body) as any;

    const res = await server.inject({
      method: 'POST',
      url: `/threads/${createdThread.id}/messages`,
      payload: { author: 'alice', content: 'hello' },
      headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as any;
    expect(body.threadId).toBe(createdThread.id);
  });

  it('2) POST /threads/:id/messages con thread inesistente → 400', async () => {
    const threadsRepo = new InMemoryThreadRepository();
    const rawMessagesRepo = new InMemoryMessageRepository();
    const messagesRepo = new ConsistentMessageRepository(rawMessagesRepo as any, threadsRepo as any);

    const server = Fastify();
    registerThreadMessageCreateRoutes(server, { repo: messagesRepo as any });

    const res = await server.inject({
      method: 'POST',
      url: '/threads/does-not-exist/messages',
      payload: { author: 'alice', content: 'hello' },
      headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('3) GET messages non è impattato dalla consistenza', async () => {
    const threadsRepo = new InMemoryThreadRepository();
    const rawMessagesRepo = new InMemoryMessageRepository();
    const messagesRepo = new ConsistentMessageRepository(rawMessagesRepo as any, threadsRepo as any);
    const messageQuery = new InMemoryMessageQueryRepository(messagesRepo as any, threadsRepo as any);
    const messageProjection = new MessageReadProjectionImpl(messageQuery);

    const server = Fastify();
    registerThreadCreateRoutes(server, { repo: threadsRepo });
    registerThreadMessageCreateRoutes(server, { repo: messagesRepo as any });
    registerMessagesGetByThreadRoutes(server, { projection: messageProjection as any });

    const threadRes = await server.inject({
      method: 'POST',
      url: '/threads',
      payload: { id: 'client-id', title: 'Hello' },
      headers: { 'content-type': 'application/json' },
    });
    expect(threadRes.statusCode).toBe(201);
    const createdThread = JSON.parse(threadRes.body) as any;

    const postRes = await server.inject({
      method: 'POST',
      url: `/threads/${createdThread.id}/messages`,
      payload: { author: 'alice', content: 'A' },
      headers: { 'content-type': 'application/json' },
    });
    expect(postRes.statusCode).toBe(201);

    const getRes = await server.inject({
      method: 'GET',
      url: `/threads/${createdThread.id}/messages`,
    });
    expect(getRes.statusCode).toBe(200);
    const body = JSON.parse(getRes.body) as any;
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages.length).toBe(1);
  });
});

