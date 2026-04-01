/**
 * Cache Opt-Out: server senza cache ritorna risultato corretto
 * Microstep 3.4.3 — la cache non è un requisito funzionale
 */

import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerThreadCreateRoutes } from '../http/routes/threads.post';
import { registerThreadListRoutes } from '../http/routes/threads.get';
import { registerThreadMessageCreateRoutes } from '../http/routes/threads.messages.post';
import { registerMessagesGetByThreadRoutes } from '../http/routes/messages.getByThread';
import { registerMessagesGetByIdRoutes } from '../http/routes/messages.getById';
import { InMemoryThreadRepository } from '../http/repositories/InMemoryThreadRepository';
import { InMemoryMessageRepository } from '../http/repositories/InMemoryMessageRepository';
import { ConsistentMessageRepository } from '../http/wiring/ConsistentMessageRepository';
import { InMemoryThreadQueryRepository } from '../../persistence/queries/InMemoryThreadQueryRepository';
import { InMemoryMessageQueryRepository } from '../../persistence/queries/InMemoryMessageQueryRepository';
import { ThreadReadProjectionImpl } from '../../core/projections/impl/ThreadReadProjectionImpl';
import { MessageReadProjectionImpl } from '../../core/projections/impl/MessageReadProjectionImpl';

describe('Cache Opt-Out', () => {
  it('server senza cache: GET /threads e POST /threads ritornano risultato corretto', async () => {
    const threadRepo = new InMemoryThreadRepository();
    const threadQuery = new InMemoryThreadQueryRepository(threadRepo as any);
    const threadProjectionRaw = new ThreadReadProjectionImpl(threadQuery);

    const server = Fastify();
    registerThreadCreateRoutes(server, { repo: threadRepo });
    registerThreadListRoutes(server, { projection: threadProjectionRaw as any });

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

  it('server senza cache: GET /threads/:id/messages e GET /messages/:id ritornano risultato corretto', async () => {
    const threadRepo = new InMemoryThreadRepository();
    const rawMessagesRepo = new InMemoryMessageRepository();
    const messagesRepo = new ConsistentMessageRepository(rawMessagesRepo as any, threadRepo as any);
    const messageQuery = new InMemoryMessageQueryRepository(messagesRepo as any, threadRepo as any);
    const messageProjectionRaw = new MessageReadProjectionImpl(messageQuery);

    const server = Fastify();
    registerThreadCreateRoutes(server, { repo: threadRepo });
    registerThreadMessageCreateRoutes(server, { repo: messagesRepo as any });
    registerMessagesGetByThreadRoutes(server, { projection: messageProjectionRaw as any });
    registerMessagesGetByIdRoutes(server, { projection: messageProjectionRaw as any });

    const postThread = await server.inject({
      method: 'POST',
      url: '/threads',
      payload: { id: 'client-id', title: 'T' },
      headers: { 'content-type': 'application/json' },
    });
    expect(postThread.statusCode).toBe(201);
    const thread = JSON.parse(postThread.body) as { id: string };

    const postMsg = await server.inject({
      method: 'POST',
      url: `/threads/${thread.id}/messages`,
      payload: { author: 'alice', content: 'hi' },
      headers: { 'content-type': 'application/json' },
    });
    expect(postMsg.statusCode).toBe(201);
    const msg = JSON.parse(postMsg.body) as { id: string };

    const getByThread = await server.inject({ method: 'GET', url: `/threads/${thread.id}/messages` });
    expect(getByThread.statusCode).toBe(200);
    const byThread = JSON.parse(getByThread.body) as { messages: { id: string; content: string }[] };
    expect(byThread.messages.length).toBe(1);
    expect(byThread.messages[0].content).toBe('hi');

    const getById = await server.inject({ method: 'GET', url: `/messages/${msg.id}` });
    expect(getById.statusCode).toBe(200);
    const byId = JSON.parse(getById.body) as { id: string; content: string };
    expect(byId.content).toBe('hi');
  });
});
