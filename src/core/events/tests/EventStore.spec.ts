/**
 * Event Store — test (Blocco 6.1.3)
 *
 * Test 1: Append-only
 * Test 2: Isolamento dal dominio
 * Test 3: Retention
 * Test 4: Listener passivo
 * Test 5: Perdita tollerata
 */

import { describe, it, expect } from 'vitest';
import type { DomainEvent } from '../DomainEvent';
import type { DomainEventStore } from '../DomainEventStore';
import { InMemoryEventStore } from '../InMemoryEventStore';
import { NoOpEventStore } from '../NoOpEventStore';
import { EventStoreListener } from '../EventStoreListener';
import { MessageSent } from '../MessageSent';
import { ThreadCreated } from '../ThreadCreated';
import { InProcessEventDispatcher } from '../InProcessEventDispatcher';
import { DispatchingEventCollector } from '../DispatchingEventCollector';
import { NoOpEventCollector } from '../EventCollector';
import { CreateMessage } from '../../messages/usecases/CreateMessage';
import type { MessageRepository } from '../../messages/MessageRepository';
import type { Message } from '../../messages/Message';

function makeMessageSent(occurredAt: number): MessageSent {
  return new MessageSent({
    eventId: 'e-1',
    messageId: 'm-1',
    threadId: 't-1',
    contentLength: 0,
    occurredAt,
  });
}

describe('Event Store (Blocco 6.1.3)', () => {
  describe('Test 1 — Append-only', () => {
    it('ordine di inserimento preservato', () => {
      const store = new InMemoryEventStore();
      const e1 = makeMessageSent(1000);
      const e2 = new ThreadCreated({
        eventId: 'e-2',
        threadId: 't-2',
        titleLength: 3,
        occurredAt: 2000,
      });
      const e3 = makeMessageSent(3000);

      store.append(e1);
      store.append(e2);
      store.append(e3);

      const all = store.getAllForTest();
      expect(all.length).toBe(3);
      expect(all[0]).toBe(e1);
      expect(all[1]).toBe(e2);
      expect(all[2]).toBe(e3);
    });

    it('interfaccia DomainEventStore non espone update/delete/find/query/replay', () => {
      const store: DomainEventStore = new InMemoryEventStore();
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(store)).filter(
        (m) => m !== 'constructor'
      );
      const forbidden = ['update', 'delete', 'remove', 'find', 'query', 'replay'];
      const hasForbidden = methods.some((m) => forbidden.some((f) => m.toLowerCase().includes(f)));
      expect(hasForbidden).toBe(false);
      expect(methods).toContain('append');
    });
  });

  describe('Test 2 — Isolamento dal dominio', () => {
    it('use case con Event Store attivo vs disattivato (NoOp): output, stato, save identici', async () => {
      const messagesWithStore: Message[] = [];
      const messagesNoStore: Message[] = [];

      const repoWithStore: MessageRepository = {
        save: async (msg) => messagesWithStore.push(msg),
        findByThreadId: async () => [],
        findById: async () => null,
      };
      const repoNoStore: MessageRepository = {
        save: async (msg) => messagesNoStore.push(msg),
        findByThreadId: async () => [],
        findById: async () => null,
      };

      const store = new InMemoryEventStore();
      const dispatcher = new InProcessEventDispatcher();
      dispatcher.register(new EventStoreListener(store));
      const collectorWithStore = new DispatchingEventCollector(dispatcher);

      const useCaseWithStore = new CreateMessage(repoWithStore, collectorWithStore);
      const useCaseNoStore = new CreateMessage(repoNoStore, new NoOpEventCollector());

      const outWithStore = await useCaseWithStore.execute({
        threadId: 't-1',
        author: 'alice',
        content: 'hello',
      });
      const outNoStore = await useCaseNoStore.execute({
        threadId: 't-1',
        author: 'alice',
        content: 'hello',
      });

      expect(outWithStore.threadId).toBe(outNoStore.threadId);
      expect(outWithStore.author).toBe(outNoStore.author);
      expect(outWithStore.content).toBe(outNoStore.content);
      expect(messagesWithStore.length).toBe(1);
      expect(messagesNoStore.length).toBe(1);
      expect(messagesWithStore[0].content).toBe(messagesNoStore[0].content);
    });
  });

  describe('Test 3 — Retention', () => {
    it('eventi con timestamp vecchio vengono eliminati secondo policy, senza errori', () => {
      const now = Date.now();
      const retentionMs = 1500;
      const store = new InMemoryEventStore({ retentionMs });

      const oldEvent = makeMessageSent(now - 2000);
      const newEvent = makeMessageSent(now);

      store.append(oldEvent);
      expect(store.getAllForTest().length).toBe(0);

      store.append(newEvent);
      const all = store.getAllForTest();
      expect(all.length).toBe(1);
      expect(all[0].occurredAt).toBe(newEvent.occurredAt);
    });

    it('retention non influisce sugli eventi nuovi', () => {
      const now = Date.now();
      const store = new InMemoryEventStore({ retentionMs: 1000 });

      store.append(makeMessageSent(now));
      store.append(makeMessageSent(now + 100));
      expect(store.getAllForTest().length).toBe(2);
    });

    it('retention disattivata (retentionMs 0): nessun pruning', () => {
      const store = new InMemoryEventStore({ retentionMs: 0 });
      store.append(makeMessageSent(0));
      store.append(makeMessageSent(100));
      expect(store.getAllForTest().length).toBe(2);
    });
  });

  describe('Test 4 — Listener passivo', () => {
    it('Event Store è registrato come listener e riceve eventi via dispatcher', () => {
      const store = new InMemoryEventStore();
      const listener = new EventStoreListener(store);
      const dispatcher = new InProcessEventDispatcher();
      dispatcher.register(listener);

      const event = makeMessageSent(Date.now());
      dispatcher.dispatch(event);

      const all = store.getAllForTest();
      expect(all.length).toBe(1);
      expect(all[0].eventType).toBe('MessageSent');
    });

    it('Event Store non emette eventi a sua volta', () => {
      const store = new InMemoryEventStore();
      const listener = new EventStoreListener(store);
      const dispatcher = new InProcessEventDispatcher();
      dispatcher.register(listener);

      dispatcher.dispatch(makeMessageSent(Date.now()));
      expect(store.getAllForTest().length).toBe(1);
      dispatcher.dispatch(makeMessageSent(Date.now()));
      expect(store.getAllForTest().length).toBe(2);
    });
  });

  describe('Test 5 — Perdita tollerata', () => {
    it('se append lancia, listener non propaga: use case completa senza fallire', async () => {
      const throwingStore: DomainEventStore = {
        append(_event: DomainEvent) {
          throw new Error('store failure');
        },
      };
      const listener = new EventStoreListener(throwingStore);
      const dispatcher = new InProcessEventDispatcher();
      dispatcher.register(listener);
      const collector = new DispatchingEventCollector(dispatcher);

      let saved = false;
      const repo: MessageRepository = {
        save: async () => {
          saved = true;
        },
        findByThreadId: async () => [],
        findById: async () => null,
      };
      const useCase = new CreateMessage(repo, collector);

      const message = await useCase.execute({
        threadId: 't-1',
        author: 'alice',
        content: 'hello',
      });

      expect(saved).toBe(true);
      expect(message.content).toBe('hello');
    });

    it('NoOpEventStore: nessun effetto, use case identico', async () => {
      const store = new NoOpEventStore();
      const listener = new EventStoreListener(store);
      const dispatcher = new InProcessEventDispatcher();
      dispatcher.register(listener);
      const collector = new DispatchingEventCollector(dispatcher);

      let saveCalls = 0;
      const repo: MessageRepository = {
        save: async () => {
          saveCalls += 1;
        },
        findByThreadId: async () => [],
        findById: async () => null,
      };
      const useCase = new CreateMessage(repo, collector);

      await useCase.execute({ threadId: 't-1', author: 'a', content: 'x' });

      expect(saveCalls).toBe(1);
    });
  });
});
