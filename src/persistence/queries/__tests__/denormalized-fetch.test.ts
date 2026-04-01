/**
 * Persistence Queries — Denormalized fetch (ThreadWithMessages, MessageWithThread)
 *
 * Verifica che i Query Repository concreti restituiscano Read Models denormalizzati
 * completi, senza composizione lato HTTP e senza accessi secondari.
 * Microstep 3.2.3: single round-trip (Prisma) verificato via mock.
 */

import { describe, it, expect, vi } from 'vitest';
import { Thread } from '../../../core/threads/Thread';
import { Message } from '../../../core/messages/Message';
import { InMemoryThreadRepository } from '../../../api/http/repositories/InMemoryThreadRepository';
import { InMemoryMessageRepository } from '../../messages/InMemoryMessageRepository';
import { InMemoryThreadQueryRepository } from '../InMemoryThreadQueryRepository';
import { InMemoryMessageQueryRepository } from '../InMemoryMessageQueryRepository';
import { PrismaThreadQueryRepository } from '../PrismaThreadQueryRepository';
import { PrismaMessageQueryRepository } from '../PrismaMessageQueryRepository';

describe('Persistence Queries — denormalized fetch', () => {
  describe('ThreadWithMessages', () => {
    it('thread inesistente → null', async () => {
      const threadRepo = new InMemoryThreadRepository();
      const messageRepo = new InMemoryMessageRepository();
      const queryRepo = new InMemoryThreadQueryRepository(threadRepo, messageRepo);

      const result = await queryRepo.findThreadWithMessagesById('non-existent');
      expect(result).toBeNull();
    });

    it('thread senza messaggi → messages: []', async () => {
      const threadRepo = new InMemoryThreadRepository();
      const messageRepo = new InMemoryMessageRepository();
      const queryRepo = new InMemoryThreadQueryRepository(threadRepo, messageRepo);

      const thread = Thread.create({ title: 'Solo thread' });
      await threadRepo.save(thread);

      const result = await queryRepo.findThreadWithMessagesById(thread.getId());
      expect(result).not.toBeNull();
      expect(result!.id).toBe(thread.getId());
      expect(result!.title).toBe('Solo thread');
      expect(result!.messages).toEqual([]);
    });

    it('thread con N messaggi → Read Model completo', async () => {
      const threadRepo = new InMemoryThreadRepository();
      const messageRepo = new InMemoryMessageRepository();
      const queryRepo = new InMemoryThreadQueryRepository(threadRepo, messageRepo);

      const thread = Thread.create({ title: 'Con messaggi' });
      await threadRepo.save(thread);
      const now = new Date();
      const m1 = new Message({
        id: 'msg-1',
        threadId: thread.getId(),
        author: 'a',
        content: 'c1',
        createdAt: now,
      });
      const m2 = new Message({
        id: 'msg-2',
        threadId: thread.getId(),
        author: 'b',
        content: 'c2',
        createdAt: new Date(now.getTime() + 1),
      });
      await messageRepo.save(m1);
      await messageRepo.save(m2);

      const result = await queryRepo.findThreadWithMessagesById(thread.getId());
      expect(result).not.toBeNull();
      expect(result!.id).toBe(thread.getId());
      expect(result!.title).toBe('Con messaggi');
      expect(result!.messages).toHaveLength(2);
      expect(result!.messages[0]).toEqual({
        id: 'msg-1',
        author: 'a',
        content: 'c1',
        createdAt: now.toISOString(),
      });
      expect(result!.messages[1]).toEqual({
        id: 'msg-2',
        author: 'b',
        content: 'c2',
        createdAt: new Date(now.getTime() + 1).toISOString(),
      });
    });

    it('findThreadWithMessagesById senza messageRepository → messages: []', async () => {
      const threadRepo = new InMemoryThreadRepository();
      const queryRepo = new InMemoryThreadQueryRepository(threadRepo);

      const thread = Thread.create({ title: 'Solo' });
      await threadRepo.save(thread);

      const result = await queryRepo.findThreadWithMessagesById(thread.getId());
      expect(result).not.toBeNull();
      expect(result!.messages).toEqual([]);
    });
  });

  describe('MessageWithThread', () => {
    it('message inesistente → null', async () => {
      const threadRepo = new InMemoryThreadRepository();
      const messageRepo = new InMemoryMessageRepository();
      const queryRepo = new InMemoryMessageQueryRepository(messageRepo, threadRepo);

      const result = await queryRepo.findMessageWithThreadById('non-existent');
      expect(result).toBeNull();
    });

    it('message esistente → Read Model completo', async () => {
      const threadRepo = new InMemoryThreadRepository();
      const messageRepo = new InMemoryMessageRepository();
      const queryRepo = new InMemoryMessageQueryRepository(messageRepo, threadRepo);

      const thread = Thread.create({ title: 'Thread per msg' });
      await threadRepo.save(thread);
      const now = new Date();
      const msg = new Message({
        id: 'm1',
        threadId: thread.getId(),
        author: 'alice',
        content: 'hello',
        createdAt: now,
      });
      await messageRepo.save(msg);

      const result = await queryRepo.findMessageWithThreadById('m1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('m1');
      expect(result!.content).toBe('hello');
      expect(result!.author).toBe('alice');
      expect(result!.createdAt).toBe(now.toISOString());
      expect(result!.thread).toEqual({
        id: thread.getId(),
        title: 'Thread per msg',
        archived: false,
      });
    });

    it('findMessageWithThreadById senza threadRepository → null', async () => {
      const messageRepo = new InMemoryMessageRepository();
      const queryRepo = new InMemoryMessageQueryRepository(messageRepo);

      const result = await queryRepo.findMessageWithThreadById('any');
      expect(result).toBeNull();
    });
  });

  describe('Denormalizzazione garantita', () => {
    it('ThreadWithMessagesReadModel restituito non richiede accessi successivi', async () => {
      const threadRepo = new InMemoryThreadRepository();
      const messageRepo = new InMemoryMessageRepository();
      const queryRepo = new InMemoryThreadQueryRepository(threadRepo, messageRepo);

      const thread = Thread.create({ title: 'T' });
      await threadRepo.save(thread);
      const msg = new Message({
        id: 'mid',
        threadId: thread.getId(),
        author: 'x',
        content: 'y',
        createdAt: new Date(),
      });
      await messageRepo.save(msg);

      const result = await queryRepo.findThreadWithMessagesById(thread.getId());
      expect(result).not.toBeNull();
      expect(result!.messages).toHaveLength(1);
      expect(result!.messages[0].id).toBe('mid');
      expect(result!.messages[0].content).toBe('y');
      expect(typeof result!.createdAt).toBe('string');
      expect(typeof result!.messages[0].createdAt).toBe('string');
    });

    it('MessageWithThreadReadModel restituito non richiede accessi successivi', async () => {
      const threadRepo = new InMemoryThreadRepository();
      const messageRepo = new InMemoryMessageRepository();
      const queryRepo = new InMemoryMessageQueryRepository(messageRepo, threadRepo);

      const thread = Thread.create({ title: 'T2' });
      await threadRepo.save(thread);
      const msg = new Message({
        id: 'm2',
        threadId: thread.getId(),
        author: 'b',
        content: 'body',
        createdAt: new Date(),
      });
      await messageRepo.save(msg);

      const result = await queryRepo.findMessageWithThreadById('m2');
      expect(result).not.toBeNull();
      expect(result!.thread.id).toBe(thread.getId());
      expect(result!.thread.title).toBe('T2');
      expect(result!.thread.archived).toBe(false);
    });
  });

  describe('Single round-trip (Prisma)', () => {
    it('findThreadWithMessagesById: 1 sola chiamata Prisma (findUnique con include)', async () => {
      const findUniqueMock = vi.fn().mockResolvedValue({
        id: 'tid',
        title: 'T',
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [
          { id: 'm1', author: 'a', content: 'c', createdAt: new Date() },
        ],
      });
      const mockClient = {
        thread: { findUnique: findUniqueMock },
      } as any;

      const repo = new PrismaThreadQueryRepository('file::memory:', mockClient);
      const result = await repo.findThreadWithMessagesById('tid');

      expect(result).not.toBeNull();
      expect(findUniqueMock).toHaveBeenCalledTimes(1);
      expect(findUniqueMock.mock.calls[0][0]).toMatchObject({
        where: { id: 'tid' },
        include: { messages: expect.anything() },
      });
    });

    it('findMessageWithThreadById: 1 sola chiamata Prisma (findUnique con include)', async () => {
      const findUniqueMock = vi.fn().mockResolvedValue({
        id: 'mid',
        content: 'c',
        author: 'a',
        createdAt: new Date(),
        thread: { id: 'tid', title: 'T', archived: false },
      });
      const mockClient = {
        message: { findUnique: findUniqueMock },
      } as any;

      const repo = new PrismaMessageQueryRepository('file::memory:', mockClient);
      const result = await repo.findMessageWithThreadById('mid');

      expect(result).not.toBeNull();
      expect(findUniqueMock).toHaveBeenCalledTimes(1);
      expect(findUniqueMock.mock.calls[0][0]).toMatchObject({
        where: { id: 'mid' },
        include: { thread: true },
      });
    });

    it('Read Model invariato: solo primitive e ISO string (ThreadWithMessages)', async () => {
      const findUniqueMock = vi.fn().mockResolvedValue({
        id: 'tid',
        title: 'T',
        archived: false,
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-01T00:00:00.000Z'),
        messages: [
          { id: 'm1', author: 'a', content: 'c', createdAt: new Date('2025-01-01T00:00:00.000Z') },
        ],
      });
      const mockClient = { thread: { findUnique: findUniqueMock } } as any;
      const repo = new PrismaThreadQueryRepository('file::memory:', mockClient);
      const result = await repo.findThreadWithMessagesById('tid');

      expect(result).not.toBeNull();
      expect(typeof result!.id).toBe('string');
      expect(typeof result!.createdAt).toBe('string');
      expect(typeof result!.messages[0].createdAt).toBe('string');
      expect(result!.messages[0].createdAt).toBe('2025-01-01T00:00:00.000Z');
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('Read Model invariato: solo primitive e ISO string (MessageWithThread)', async () => {
      const findUniqueMock = vi.fn().mockResolvedValue({
        id: 'mid',
        content: 'c',
        author: 'a',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        thread: { id: 'tid', title: 'T', archived: false },
      });
      const mockClient = { message: { findUnique: findUniqueMock } } as any;
      const repo = new PrismaMessageQueryRepository('file::memory:', mockClient);
      const result = await repo.findMessageWithThreadById('mid');

      expect(result).not.toBeNull();
      expect(typeof result!.createdAt).toBe('string');
      expect(result!.createdAt).toBe('2025-01-01T00:00:00.000Z');
      expect(() => JSON.stringify(result)).not.toThrow();
    });
  });
});
