/**
 * Event Dispatcher — test (Blocco 6.1.2)
 *
 * Test 1: Dispatch sincrono
 * Test 2: Ordine di notifica
 * Test 3: Nessun side-effect sul dominio
 * Test 4: Isolamento completo
 * Test 5: Listener non blocca il flusso
 */

import { describe, it, expect } from 'vitest';
import type { DomainEvent } from '../DomainEvent';
import type { DomainEventListener } from '../DomainEventListener';
import { InProcessEventDispatcher } from '../InProcessEventDispatcher';
import { DispatchingEventCollector } from '../DispatchingEventCollector';
import { NoOpEventCollector } from '../EventCollector';
import { MessageSent } from '../MessageSent';
import { CreateMessage } from '../../messages/usecases/CreateMessage';
import type { MessageRepository } from '../../messages/MessageRepository';
import type { Message } from '../../messages/Message';

// —— Test 1 — Dispatch sincrono ——

describe('Event Dispatcher (Blocco 6.1.2)', () => {
  describe('Test 1 — Dispatch sincrono', () => {
    it('handle() viene chiamato immediatamente, prima della fine del metodo chiamante', () => {
      let handled = false;
      const listener: DomainEventListener = {
        handle(_event: DomainEvent) {
          handled = true;
        },
      };
      const dispatcher = new InProcessEventDispatcher();
      dispatcher.register(listener);

      const event = new MessageSent({
        eventId: 'e-1',
        messageId: 'm-1',
        threadId: 't-1',
        contentLength: 0,
        occurredAt: Date.now(),
      });

      dispatcher.dispatch(event);

      expect(handled).toBe(true);
    });
  });

  describe('Test 2 — Ordine di notifica', () => {
    it('ordine di chiamata rispetta ordine di registrazione', () => {
      const order: number[] = [];
      const makeListener = (id: number): DomainEventListener => ({
        handle(_event: DomainEvent) {
          order.push(id);
        },
      });

      const dispatcher = new InProcessEventDispatcher();
      dispatcher.register(makeListener(1));
      dispatcher.register(makeListener(2));
      dispatcher.register(makeListener(3));

      const event = new MessageSent({
        eventId: 'e-1',
        messageId: 'm-1',
        threadId: 't-1',
        contentLength: 0,
        occurredAt: Date.now(),
      });
      dispatcher.dispatch(event);

      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('Test 3 — Nessun side-effect sul dominio', () => {
    it('CreateMessage con DispatchingEventCollector: stato, output, save identici al caso senza dispatcher', async () => {
      const messagesNoOp: Message[] = [];
      const messagesDispatching: Message[] = [];

      const repoNoOp: MessageRepository = {
        save: async (msg) => {
          messagesNoOp.push(msg);
        },
        findByThreadId: async () => [],
        findById: async () => null,
      };
      const repoDispatching: MessageRepository = {
        save: async (msg) => {
          messagesDispatching.push(msg);
        },
        findByThreadId: async () => [],
        findById: async () => null,
      };

      const useCaseNoOp = new CreateMessage(repoNoOp, new NoOpEventCollector());
      const dispatcher = new InProcessEventDispatcher();
      const collector = new DispatchingEventCollector(dispatcher);
      const useCaseDispatching = new CreateMessage(repoDispatching, collector);

      const outNoOp = await useCaseNoOp.execute({
        threadId: 't-1',
        author: 'alice',
        content: 'hello',
      });
      const outDispatching = await useCaseDispatching.execute({
        threadId: 't-1',
        author: 'alice',
        content: 'hello',
      });

      expect(outDispatching.threadId).toBe(outNoOp.threadId);
      expect(outDispatching.author).toBe(outNoOp.author);
      expect(outDispatching.content).toBe(outNoOp.content);
      expect(messagesDispatching.length).toBe(1);
      expect(messagesNoOp.length).toBe(1);
      expect(messagesDispatching[0].content).toBe(messagesNoOp[0].content);
    });
  });

  describe('Test 4 — Isolamento completo', () => {
    it('CreateMessage senza collector: stesso comportamento dei test esistenti', async () => {
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
      expect(message.content).toBe('hello');
    });

    it('NoOpEventCollector: nessuna dipendenza obbligatoria dal dispatcher', async () => {
      const useCase = new CreateMessage(
        {
          save: async () => {},
          findByThreadId: async () => [],
          findById: async () => null,
        },
        new NoOpEventCollector()
      );
      const message = await useCase.execute({
        threadId: 't-1',
        author: 'a',
        content: 'x',
      });
      expect(message.threadId).toBe('t-1');
    });
  });

  describe('Test 5 — Listener non blocca il flusso', () => {
    it('listener vuoto: dominio completa il flusso', async () => {
      const listener: DomainEventListener = {
        handle(_event: DomainEvent) {
          // vuoto
        },
      };
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
        content: 'hi',
      });

      expect(saved).toBe(true);
      expect(message.content).toBe('hi');
    });

    it('listener che logga (non muta): dominio completa il flusso', async () => {
      const log: string[] = [];
      const listener: DomainEventListener = {
        handle(event: DomainEvent) {
          log.push(event.eventType);
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

      await useCase.execute({
        threadId: 't-1',
        author: 'alice',
        content: 'hi',
      });

      expect(log.length).toBeGreaterThanOrEqual(1);
      expect(log.some((t) => t === 'MessageSent')).toBe(true);
    });

    it('se un listener lancia, l’errore si propaga (nessuno swallowing)', () => {
      const listener: DomainEventListener = {
        handle(_event: DomainEvent) {
          throw new Error('listener error');
        },
      };
      const dispatcher = new InProcessEventDispatcher();
      dispatcher.register(listener);

      const event = new MessageSent({
        eventId: 'e-1',
        messageId: 'm-1',
        threadId: 't-1',
        contentLength: 0,
        occurredAt: Date.now(),
      });

      expect(() => dispatcher.dispatch(event)).toThrow('listener error');
    });
  });

  describe('Logging neutro (debug)', () => {
    it('se debugLog è fornito, viene chiamato con eventType, occurredAt, listenerCount', () => {
      const calls: Array<{ eventType: string; occurredAt: number; listenerCount: number }> = [];
      const dispatcher = new InProcessEventDispatcher({
        debugLog: (eventType, occurredAt, listenerCount) => {
          calls.push({ eventType, occurredAt, listenerCount });
        },
      });
      dispatcher.register({ handle: () => {} });

      const event = new MessageSent({
        eventId: 'e-1',
        messageId: 'm-1',
        threadId: 't-1',
        contentLength: 0,
        occurredAt: 12345,
      });
      dispatcher.dispatch(event);

      expect(calls.length).toBe(1);
      expect(calls[0].eventType).toBe('MessageSent');
      expect(calls[0].occurredAt).toBe(12345);
      expect(calls[0].listenerCount).toBe(1);
    });

    it('senza debugLog non viene effettuata alcuna chiamata di log', () => {
      const dispatcher = new InProcessEventDispatcher();
      dispatcher.register({ handle: () => {} });
      const event = new MessageSent({
        eventId: 'e-1',
        messageId: 'm-1',
        threadId: 't-1',
        contentLength: 0,
        occurredAt: 0,
      });
      expect(() => dispatcher.dispatch(event)).not.toThrow();
    });
  });
});
