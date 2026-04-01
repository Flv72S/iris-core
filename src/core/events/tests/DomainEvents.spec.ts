/**
 * Domain Events — test (Blocco 6.1.1)
 *
 * Test 1: Creazione evento
 * Test 2: Emissione senza side-effect
 * Test 3: Append-only
 * Test 4: MVP invariato
 */

import { describe, it, expect } from 'vitest';
import type { DomainEvent } from '../DomainEvent';
import { NoOpEventCollector } from '../EventCollector';
import {
  MessageSent,
  MessageEdited,
  ThreadCreated,
  ReplyAdded,
  ThreadArchived,
  UserInactive,
} from '../index';
import { CreateMessage } from '../../messages/usecases/CreateMessage';
import { CreateThread } from '../../threads/usecases/CreateThread';
import type { MessageRepository } from '../../messages/MessageRepository';
import type { Message } from '../../messages/Message';
import type { ThreadRepository } from '../../threads/ThreadRepository';
import { Thread } from '../../threads/Thread';

// —— Test 1 — Creazione evento ——

const eventClasses = [
  {
    name: 'MessageSent',
    factory: () =>
      new MessageSent({
        eventId: 'e-1',
        messageId: 'm-1',
        threadId: 't-1',
        contentLength: 5,
        occurredAt: 1000,
      }),
  },
  {
    name: 'MessageEdited',
    factory: () =>
      new MessageEdited({
        eventId: 'e-2',
        messageId: 'm-2',
        threadId: 't-2',
        contentLengthAfter: 10,
        occurredAt: 2000,
      }),
  },
  {
    name: 'ThreadCreated',
    factory: () =>
      new ThreadCreated({
        eventId: 'e-3',
        threadId: 't-3',
        titleLength: 3,
        occurredAt: 3000,
      }),
  },
  {
    name: 'ReplyAdded',
    factory: () =>
      new ReplyAdded({
        eventId: 'e-4',
        messageId: 'm-4',
        threadId: 't-4',
        contentLength: 7,
        occurredAt: 4000,
      }),
  },
  {
    name: 'ThreadArchived',
    factory: () =>
      new ThreadArchived({
        eventId: 'e-5',
        threadId: 't-5',
        occurredAt: 5000,
      }),
  },
  {
    name: 'UserInactive',
    factory: () =>
      new UserInactive({
        eventId: 'e-6',
        userId: 'u-1',
        lastActiveAt: 6000,
        occurredAt: 7000,
      }),
  },
];

describe('Domain Events (Blocco 6.1.1)', () => {
  describe('Test 1 — Creazione evento', () => {
    eventClasses.forEach(({ name, factory }) => {
      it(`${name}: si istanzia correttamente e ha eventId, eventType, occurredAt`, () => {
        const event = factory();
        expect(event.eventId).toBeDefined();
        expect(typeof event.eventId).toBe('string');
        expect(event.eventType).toBeDefined();
        expect(typeof event.eventType).toBe('string');
        expect(event.occurredAt).toBeDefined();
        expect(typeof event.occurredAt).toBe('number');
        expect(event.aggregateId).toBeDefined();
      });

      it(`${name}: è immutabile dopo la creazione`, () => {
        const event = factory() as DomainEvent & Record<string, unknown>;
        expect(Object.isFrozen(event)).toBe(true);
        const desc = Object.getOwnPropertyDescriptor(event, 'eventId');
        expect(desc?.writable).toBe(false);
      });
    });
  });

  describe('Test 2 — Emissione senza side-effect', () => {
    it('CreateMessage con collector: evento emesso, stato dominio invariato, nessuna dipendenza esterna', async () => {
      const collected: DomainEvent[] = [];
      const collector = {
        emit(e: DomainEvent) {
          collected.push(e);
        },
      };

      const repo: MessageRepository = {
        save: async (msg: Message) => {},
        findByThreadId: async () => [],
        findById: async () => null,
      };

      const useCase = new CreateMessage(repo, collector);
      const message = await useCase.execute({
        threadId: 't-1',
        author: 'alice',
        content: 'hello',
      });

      expect(collected.length).toBeGreaterThanOrEqual(1);
      const sent = collected.find((e) => e.eventType === 'MessageSent');
      expect(sent).toBeDefined();
      expect(sent!.aggregateId).toBe(message.id);
      expect(sent!.metadata).toBeDefined();
      expect((sent!.metadata as Record<string, number>).contentLength).toBe(5);

      expect(message.id).toBeDefined();
      expect(message.threadId).toBe('t-1');
      expect(message.content).toBe('hello');
    });

    it('CreateThread con collector: evento emesso, stato dominio invariato', async () => {
      const collected: DomainEvent[] = [];
      const collector = {
        emit(e: DomainEvent) {
          collected.push(e);
        },
      };

      const repo: ThreadRepository = {
        save: async () => {},
        findById: async () => null,
        findAll: async () => [],
        deleteById: async () => {},
      };

      const useCase = new CreateThread(repo, collector);
      const thread = await useCase.execute({ title: 'Hi' });

      expect(collected.length).toBe(1);
      expect(collected[0].eventType).toBe('ThreadCreated');
      expect(collected[0].aggregateId).toBe(thread.getId());
      expect(thread.getTitle()).toBe('Hi');
      expect(thread.isArchived()).toBe(false);
    });
  });

  describe('Test 3 — Append-only', () => {
    it('non esistono metodi di update/delete sugli eventi', () => {
      const event = new MessageSent({
        eventId: 'e-1',
        messageId: 'm-1',
        threadId: 't-1',
        contentLength: 0,
        occurredAt: 0,
      });

      const proto = Object.getPrototypeOf(event);
      const names = Object.getOwnPropertyNames(proto).filter(
        (n) => n !== 'constructor' && typeof (proto as Record<string, unknown>)[n] === 'function'
      );
      const hasUpdate = names.some((n) => /update|edit|delete|remove|mutate/i.test(n));
      expect(hasUpdate).toBe(false);
    });

    it('API espone solo creazione e lettura (proprietà readonly)', () => {
      const event = new ThreadArchived({
        eventId: 'e-1',
        threadId: 't-1',
        occurredAt: 1000,
      });
      expect(event.eventId).toBe('e-1');
      expect(event.aggregateId).toBe('t-1');
      expect(event.occurredAt).toBe(1000);
    });
  });

  describe('Test 4 — MVP invariato', () => {
    it('CreateMessage senza collector e con NoOp: stesso output e stesso stato', async () => {
      const messagesWithout: Message[] = [];
      const messagesWithNoOp: Message[] = [];

      const repoWithout: MessageRepository = {
        save: async (msg) => {
          messagesWithout.push(msg);
        },
        findByThreadId: async () => [],
        findById: async () => null,
      };
      const repoWithNoOp: MessageRepository = {
        save: async (msg) => {
          messagesWithNoOp.push(msg);
        },
        findByThreadId: async () => [],
        findById: async () => null,
      };

      const useCaseWithout = new CreateMessage(repoWithout);
      const useCaseWithNoOp = new CreateMessage(repoWithNoOp, new NoOpEventCollector());

      const outWithout = await useCaseWithout.execute({
        threadId: 't-a',
        author: 'alice',
        content: 'same',
      });
      const outWithNoOp = await useCaseWithNoOp.execute({
        threadId: 't-a',
        author: 'alice',
        content: 'same',
      });

      expect(outWithout.threadId).toBe(outWithNoOp.threadId);
      expect(outWithout.author).toBe(outWithNoOp.author);
      expect(outWithout.content).toBe(outWithNoOp.content);
      expect(messagesWithout.length).toBe(1);
      expect(messagesWithNoOp.length).toBe(1);
      expect(messagesWithNoOp[0].content).toBe(messagesWithout[0].content);
    });

    it('CreateThread senza collector e con NoOp: stesso output e stesso stato', async () => {
      let storedWithout: Thread | null = null;
      let storedWithNoOp: Thread | null = null;

      const repoWithout: ThreadRepository = {
        save: async (t) => {
          storedWithout = t;
        },
        findById: async () => null,
        findAll: async () => [],
        deleteById: async () => {},
      };
      const repoWithNoOp: ThreadRepository = {
        save: async (t) => {
          storedWithNoOp = t;
        },
        findById: async () => null,
        findAll: async () => [],
        deleteById: async () => {},
      };

      const useCaseWithout = new CreateThread(repoWithout);
      const useCaseWithNoOp = new CreateThread(repoWithNoOp, new NoOpEventCollector());

      const outWithout = await useCaseWithout.execute({ title: 'Same' });
      const outWithNoOp = await useCaseWithNoOp.execute({ title: 'Same' });

      expect(outWithout.getTitle()).toBe(outWithNoOp.getTitle());
      expect(outWithout.isArchived()).toBe(outWithNoOp.isArchived());
      expect(storedWithout?.getTitle()).toBe(storedWithNoOp?.getTitle());
    });

    it('CreateMessage senza collector: comportamento identico ai test esistenti (save una volta, messaggio valido)', async () => {
      let saveCalls = 0;
      const repo: MessageRepository = {
        save: async () => {
          saveCalls += 1;
        },
        findByThreadId: async () => [],
        findById: async () => null,
      };
      const useCase = new CreateMessage(repo);
      const message = await useCase.execute({
        threadId: 't-1',
        author: 'alice',
        content: 'hello',
      });

      expect(saveCalls).toBe(1);
      expect(message.id).toBeDefined();
      expect(message.threadId).toBe('t-1');
      expect(message.author).toBe('alice');
      expect(message.content).toBe('hello');
    });

    it('CreateThread senza collector: comportamento identico ai test esistenti (save una volta, thread valido)', async () => {
      let saveCalls = 0;
      const repo: ThreadRepository = {
        save: async () => {
          saveCalls += 1;
        },
        findById: async () => null,
        findAll: async () => [],
        deleteById: async () => {},
      };
      const useCase = new CreateThread(repo);
      const thread = await useCase.execute({ title: 'Hello' });

      expect(saveCalls).toBe(1);
      expect(thread.getId()).toBeDefined();
      expect(thread.getTitle()).toBe('Hello');
      expect(thread.isArchived()).toBe(false);
    });
  });
});
