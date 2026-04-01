/**
 * BLOCCO 6.1 FREEZE — Architecture Invariants
 *
 * Test di congelamento: vincoli non negoziabili dell'Event & Signal Layer.
 * Nessun refactor, nessuna estensione, nessuna "piccola utilità" dopo il freeze.
 *
 * Test 1: MVP invariato (hard guarantee)
 * Test 2: Event Layer non decide
 * Test 3: API proibite (regressione)
 * Test 4: Disattivabilità totale
 * Test 5: Side-effect zero
 */

import { describe, it, expect } from 'vitest';
import type { DomainEvent } from '../DomainEvent';
import type { DomainEventListener } from '../DomainEventListener';
import type { DomainEventStore } from '../DomainEventStore';
import { NoOpEventCollector } from '../EventCollector';
import { DispatchingEventCollector } from '../DispatchingEventCollector';
import { InProcessEventDispatcher } from '../InProcessEventDispatcher';
import { NoOpEventStore } from '../NoOpEventStore';
import { EventStoreListener } from '../EventStoreListener';
import { CreateMessage } from '../../messages/usecases/CreateMessage';
import { CreateThread } from '../../threads/usecases/CreateThread';
import type { MessageRepository } from '../../messages/MessageRepository';
import type { Message } from '../../messages/Message';
import type { ThreadRepository } from '../../threads/ThreadRepository';
import type { Thread } from '../../threads/Thread';
import { InMemoryEventStore } from '../InMemoryEventStore';

// —— Test 1 — MVP invariato (hard guarantee) ——

describe('BLOCCO 6.1 FREEZE — Architecture Invariants', () => {
  describe('Test 1 — MVP invariato (hard guarantee)', () => {
    it('use case senza collector, con NoOpEventCollector, con DispatchingEventCollector + NoOpEventStore: stesso output, stato, side-effect persistenti', async () => {
      const outNoCollector: { message: Message; saveCalls: number } = { message: null!, saveCalls: 0 };
      const outNoOpCollector: { message: Message; saveCalls: number } = { message: null!, saveCalls: 0 };
      const outDispatchingNoOpStore: { message: Message; saveCalls: number } = {
        message: null!,
        saveCalls: 0,
      };

      const repo1: MessageRepository = {
        save: async (msg) => {
          outNoCollector.saveCalls += 1;
          outNoCollector.message = msg;
        },
        findByThreadId: async () => [],
        findById: async () => null,
      };
      const repo2: MessageRepository = {
        save: async (msg) => {
          outNoOpCollector.saveCalls += 1;
          outNoOpCollector.message = msg;
        },
        findByThreadId: async () => [],
        findById: async () => null,
      };
      const repo3: MessageRepository = {
        save: async (msg) => {
          outDispatchingNoOpStore.saveCalls += 1;
          outDispatchingNoOpStore.message = msg;
        },
        findByThreadId: async () => [],
        findById: async () => null,
      };

      const uc1 = new CreateMessage(repo1);
      const uc2 = new CreateMessage(repo2, new NoOpEventCollector());
      const dispatcher = new InProcessEventDispatcher();
      dispatcher.register(new EventStoreListener(new NoOpEventStore()));
      const uc3 = new CreateMessage(repo3, new DispatchingEventCollector(dispatcher));

      const input = { threadId: 't-1', author: 'alice', content: 'hello' };
      const m1 = await uc1.execute(input);
      const m2 = await uc2.execute(input);
      const m3 = await uc3.execute(input);

      expect(m1.threadId).toBe(m2.threadId);
      expect(m1.threadId).toBe(m3.threadId);
      expect(m1.author).toBe(m2.author);
      expect(m1.author).toBe(m3.author);
      expect(m1.content).toBe(m2.content);
      expect(m1.content).toBe(m3.content);
      expect(outNoCollector.saveCalls).toBe(1);
      expect(outNoOpCollector.saveCalls).toBe(1);
      expect(outDispatchingNoOpStore.saveCalls).toBe(1);
      expect(outNoCollector.message?.content).toBe(outNoOpCollector.message?.content);
      expect(outNoCollector.message?.content).toBe(outDispatchingNoOpStore.message?.content);
    });

    it('CreateThread: senza collector, con NoOp, con Dispatching+NoOpStore — stesso output e stato', async () => {
      let save1 = 0;
      let save2 = 0;
      let save3 = 0;
      let thread1: Thread | null = null;
      let thread2: Thread | null = null;
      let thread3: Thread | null = null;

      const repo1: ThreadRepository = {
        save: async (t) => {
          save1 += 1;
          thread1 = t;
        },
        findById: async () => null,
        findAll: async () => [],
        deleteById: async () => {},
      };
      const repo2: ThreadRepository = {
        save: async (t) => {
          save2 += 1;
          thread2 = t;
        },
        findById: async () => null,
        findAll: async () => [],
        deleteById: async () => {},
      };
      const repo3: ThreadRepository = {
        save: async (t) => {
          save3 += 1;
          thread3 = t;
        },
        findById: async () => null,
        findAll: async () => [],
        deleteById: async () => {},
      };

      const uc1 = new CreateThread(repo1);
      const uc2 = new CreateThread(repo2, new NoOpEventCollector());
      const dispatcher = new InProcessEventDispatcher();
      dispatcher.register(new EventStoreListener(new NoOpEventStore()));
      const uc3 = new CreateThread(repo3, new DispatchingEventCollector(dispatcher));

      const out1 = await uc1.execute({ title: 'T' });
      const out2 = await uc2.execute({ title: 'T' });
      const out3 = await uc3.execute({ title: 'T' });

      expect(out1.getTitle()).toBe(out2.getTitle());
      expect(out1.getTitle()).toBe(out3.getTitle());
      expect(save1).toBe(1);
      expect(save2).toBe(1);
      expect(save3).toBe(1);
      expect(thread1?.getTitle()).toBe(thread2?.getTitle());
      expect(thread1?.getTitle()).toBe(thread3?.getTitle());
    });
  });

  describe('Test 2 — Event Layer non decide', () => {
    it('DomainEventListener.handle non restituisce valori (void)', () => {
      const listener: DomainEventListener = {
        handle(_event: DomainEvent): void {
          // void; nessun return
        },
      };
      const event = { eventId: 'e', eventType: 'X', occurredAt: 0, aggregateId: 'a' } as DomainEvent;
      const result = listener.handle(event);
      expect(result).toBeUndefined();
    });

    it('nessun listener modifica input o output del dominio', async () => {
      const collected: DomainEvent[] = [];
      const listener: DomainEventListener = {
        handle(event: DomainEvent) {
          collected.push(event);
        },
      };
      const dispatcher = new InProcessEventDispatcher();
      dispatcher.register(listener);
      const collector = new DispatchingEventCollector(dispatcher);

      let savedContent = '';
      const repo: MessageRepository = {
        save: async (msg) => {
          savedContent = msg.content;
        },
        findByThreadId: async () => [],
        findById: async () => null,
      };
      const useCase = new CreateMessage(repo, collector);
      const input = { threadId: 't-1', author: 'alice', content: 'unchanged' };
      const message = await useCase.execute(input);

      expect(message.content).toBe('unchanged');
      expect(savedContent).toBe('unchanged');
      expect(collected.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Test 3 — API proibite (regressione)', () => {
    const FORBIDDEN_METHOD_NAMES = ['update', 'delete', 'remove', 'find', 'query', 'replay'];

    it('DomainEventStore: implementazioni 6.1 non espongono metodi con nomi proibiti', () => {
      const implementations: DomainEventStore[] = [
        new InMemoryEventStore(),
        new NoOpEventStore(),
      ];
      for (const store of implementations) {
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(store)).filter(
          (m) => m !== 'constructor'
        );
        for (const method of methods) {
          const lower = method.toLowerCase();
          const forbidden = FORBIDDEN_METHOD_NAMES.some((f) => lower.includes(f));
          expect(forbidden).toBe(false);
        }
        expect(methods).toContain('append');
      }
    });

    it('DomainEventStore: espone append; nessun metodo con nome proibito (update/delete/find/query/replay)', () => {
      const stores: DomainEventStore[] = [new NoOpEventStore(), new InMemoryEventStore()];
      const forbidden = ['update', 'delete', 'remove', 'find', 'query', 'replay'];
      for (const store of stores) {
        const keys = Object.getOwnPropertyNames(Object.getPrototypeOf(store)).filter(
          (k) => k !== 'constructor'
        );
        expect(keys).toContain('append');
        for (const key of keys) {
          const lower = key.toLowerCase();
          expect(forbidden.some((f) => lower.includes(f))).toBe(false);
        }
      }
    });
  });

  describe('Test 4 — Disattivabilità totale', () => {
    it('collector assente: use case completa senza errori', async () => {
      const repo: MessageRepository = {
        save: async () => {},
        findByThreadId: async () => [],
        findById: async () => null,
      };
      const useCase = new CreateMessage(repo);
      const message = await useCase.execute({
        threadId: 't-1',
        author: 'alice',
        content: 'hi',
      });
      expect(message.content).toBe('hi');
    });

    it('collector NoOp + dispatcher assente: nessuna differenza funzionale', async () => {
      let saveCalls = 0;
      const repo: MessageRepository = {
        save: async () => {
          saveCalls += 1;
        },
        findByThreadId: async () => [],
        findById: async () => null,
      };
      const useCase = new CreateMessage(repo, new NoOpEventCollector());
      await useCase.execute({ threadId: 't-1', author: 'a', content: 'x' });
      expect(saveCalls).toBe(1);
    });

    it('DispatchingEventCollector + zero listener + NoOpEventStore: nessun errore, stesso output', async () => {
      const dispatcher = new InProcessEventDispatcher();
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
      const message = await useCase.execute({ threadId: 't-1', author: 'a', content: 'y' });
      expect(message.content).toBe('y');
      expect(saveCalls).toBe(1);
    });
  });

  describe('Test 5 — Side-effect zero', () => {
    it('nessun evento cambia stato dominio: output e save invariati', async () => {
      const store = new InMemoryEventStore();
      const dispatcher = new InProcessEventDispatcher();
      dispatcher.register(new EventStoreListener(store));
      const collector = new DispatchingEventCollector(dispatcher);

      let saveCalls = 0;
      let savedContent = '';
      const repo: MessageRepository = {
        save: async (msg) => {
          saveCalls += 1;
          savedContent = msg.content;
        },
        findByThreadId: async () => [],
        findById: async () => null,
      };
      const useCase = new CreateMessage(repo, collector);
      const message = await useCase.execute({ threadId: 't-1', author: 'alice', content: 'data' });

      expect(message.content).toBe('data');
      expect(savedContent).toBe('data');
      expect(saveCalls).toBe(1);
    });

    it('nessun evento blocca il use case: completamento garantito', async () => {
      const dispatcher = new InProcessEventDispatcher();
      dispatcher.register({ handle: () => {} });
      const collector = new DispatchingEventCollector(dispatcher);
      let completed = false;
      const repo: MessageRepository = {
        save: async () => {
          completed = true;
        },
        findByThreadId: async () => [],
        findById: async () => null,
      };
      const useCase = new CreateMessage(repo, collector);
      await useCase.execute({ threadId: 't-1', author: 'a', content: 'b' });
      expect(completed).toBe(true);
    });

    it('nessuna dipendenza temporale: dispatch sincrono, nessun defer', async () => {
      let handleCalledBeforeReturn = false;
      const listener: DomainEventListener = {
        handle(_event: DomainEvent) {
          handleCalledBeforeReturn = true;
        },
      };
      const dispatcher = new InProcessEventDispatcher();
      dispatcher.register(listener);
      const collector = new DispatchingEventCollector(dispatcher);
      const repo: MessageRepository = {
        save: async () => {},
        findByThreadId: async () => [],
        findById: async () => null,
      };
      const useCase = new CreateMessage(repo, collector);
      await useCase.execute({ threadId: 't-1', author: 'a', content: 'c' });
      expect(handleCalledBeforeReturn).toBe(true);
    });
  });
});
