/**
 * Privacy Guard — test (6.2.3)
 *
 * Test di invarianza MVP, esclusione, cancellazione, degradazione.
 */

import { describe, it, expect } from 'vitest';
import type { DomainEvent } from '../../events/DomainEvent';
import type { DomainEventListener } from '../../events/DomainEventListener';
import {
  PrivacyGuard,
  NoOpPrivacyGuard,
  UserOptOutPolicy,
  ContextIsolationPolicy,
  PrivacyDataClearer,
  type PrivacyContext,
} from '../index';
import { InMemoryBehavioralSnapshotL0Reader } from '../../behavioral-snapshot/in-memory-l0-reader';
import { InMemoryBehavioralSnapshotL1Store } from '../../behavioral-snapshot/level1-store';

function event(overrides: Partial<DomainEvent> & { eventType: string }): DomainEvent {
  return {
    eventId: 'e-1',
    eventType: overrides.eventType,
    occurredAt: Date.now(),
    aggregateId: 'agg-1',
    metadata: {},
    ...overrides,
  };
}

describe('Privacy Guard (6.2.3)', () => {
  describe('A. Test di invarianza MVP', () => {
    it('Privacy Guard attivo vs NoOp: downstream riceve stesso set quando nessuna policy nega', () => {
      const receivedWithGuard: DomainEvent[] = [];
      const receivedWithNoOp: DomainEvent[] = [];
      const downstreamGuard: DomainEventListener = { handle: (e) => receivedWithGuard.push(e) };
      const downstreamNoOp: DomainEventListener = { handle: (e) => receivedWithNoOp.push(e) };

      const context: PrivacyContext = {
        optedOutUserIds: new Set(),
        isolatedContextIds: new Set(),
        guardDisabled: false,
      };
      const guard = new PrivacyGuard(downstreamGuard, [], context);
      const noOp = new NoOpPrivacyGuard(downstreamNoOp);

      const ev = event({ eventType: 'MessageSent' });
      guard.handle(ev);
      noOp.handle(ev);

      expect(receivedWithGuard.length).toBe(1);
      expect(receivedWithNoOp.length).toBe(1);
      expect(receivedWithGuard[0].eventType).toBe(receivedWithNoOp[0].eventType);
    });

    it('Privacy Guard NoOp: tutti gli eventi passano al downstream', () => {
      const received: DomainEvent[] = [];
      const noOp = new NoOpPrivacyGuard({ handle: (e) => received.push(e) });
      noOp.handle(event({ eventType: 'ThreadCreated' }));
      noOp.handle(event({ eventType: 'MessageSent' }));
      expect(received.length).toBe(2);
    });
  });

  describe('B. Test di esclusione', () => {
    it('evento da utente opt-out → non arriva a downstream (L0)', () => {
      const received: DomainEvent[] = [];
      const context: PrivacyContext = {
        optedOutUserIds: new Set(['user-opt-out']),
        isolatedContextIds: new Set(),
        guardDisabled: false,
        getUserIdFromEvent: (e) => (e.metadata?.author as string) ?? null,
      };
      const guard = new PrivacyGuard(
        { handle: (e) => received.push(e) },
        [new UserOptOutPolicy()],
        context
      );
      guard.handle(
        event({
          eventType: 'MessageSent',
          metadata: { author: 'user-opt-out', threadId: 't-1', contentLength: 5 },
        })
      );
      expect(received.length).toBe(0);
    });

    it('evento da contesto isolato → non arriva a downstream', () => {
      const received: DomainEvent[] = [];
      const context: PrivacyContext = {
        optedOutUserIds: new Set(),
        isolatedContextIds: new Set(['thread-futile']),
        guardDisabled: false,
        getContextIdFromEvent: (e) => (e.metadata?.threadId as string) ?? e.aggregateId ?? null,
      };
      const guard = new PrivacyGuard(
        { handle: (e) => received.push(e) },
        [new ContextIsolationPolicy()],
        context
      );
      guard.handle(
        event({
          eventType: 'MessageSent',
          metadata: { threadId: 'thread-futile', contentLength: 1 },
        })
      );
      expect(received.length).toBe(0);
    });

    it('evento valido (non opt-out, non contesto isolato) → arriva a downstream', () => {
      const received: DomainEvent[] = [];
      const context: PrivacyContext = {
        optedOutUserIds: new Set(['other-user']),
        isolatedContextIds: new Set(['other-thread']),
        guardDisabled: false,
        getUserIdFromEvent: (e) => (e.metadata?.author as string) ?? null,
        getContextIdFromEvent: (e) => (e.metadata?.threadId as string) ?? null,
      };
      const guard = new PrivacyGuard(
        { handle: (e) => received.push(e) },
        [new UserOptOutPolicy(), new ContextIsolationPolicy()],
        context
      );
      guard.handle(
        event({
          eventType: 'MessageSent',
          metadata: { author: 'allowed-user', threadId: 'allowed-thread', contentLength: 10 },
        })
      );
      expect(received.length).toBe(1);
    });
  });

  describe('C. Test di cancellazione', () => {
    it('dopo clearAll: L0 reader e L1 store sono vuoti', () => {
      const l0Reader = new InMemoryBehavioralSnapshotL0Reader();
      const l1Store = new InMemoryBehavioralSnapshotL1Store();
      l0Reader.setThreadSnapshot('t-1', {
        messageCount: 5,
        avgMessageLength: 10,
        lastMessageTimestamp: 1000,
        rawFrequency: 1,
        chatType: '1-to-1',
      });
      l1Store.writeThreadSnapshot('t-1', {
        normalizedFrequency: 1,
        temporalDensity: 0.2,
        frequencyDelta: 0,
        technicalInactivityMs: 0,
      });
      const clearer = new PrivacyDataClearer([
        l0Reader as { clearForPrivacy(): void },
        l1Store,
      ]);
      clearer.clearAll();
      expect(l0Reader.getThreadSnapshot('t-1')).toBeNull();
      expect(l1Store.getThreadSnapshotForTest('t-1')).toBeNull();
    });
  });

  describe('D. Test di degradazione', () => {
    it('se una policy lancia: il guard non propaga e il downstream non riceve (fail-safe)', () => {
      const received: DomainEvent[] = [];
      const context: PrivacyContext = {
        optedOutUserIds: new Set(),
        isolatedContextIds: new Set(),
        guardDisabled: false,
      };
      const failingPolicy: import('../PrivacyPolicy').PrivacyPolicy = {
        evaluate: () => {
          throw new Error('policy error');
        },
      };
      const guard = new PrivacyGuard(
        { handle: (e) => received.push(e) },
        [failingPolicy],
        context
      );
      guard.handle(event({ eventType: 'MessageSent' }));
      expect(received.length).toBe(0);
    });

    it('guardDisabled: tutti gli eventi passano indipendentemente da opt-out', () => {
      const received: DomainEvent[] = [];
      const context: PrivacyContext = {
        optedOutUserIds: new Set(['opted-out']),
        isolatedContextIds: new Set(),
        guardDisabled: true,
        getUserIdFromEvent: (e) => (e.metadata?.author as string) ?? null,
      };
      const guard = new PrivacyGuard(
        { handle: (e) => received.push(e) },
        [new UserOptOutPolicy()],
        context
      );
      guard.handle(
        event({
          eventType: 'MessageSent',
          metadata: { author: 'opted-out', threadId: 't-1', contentLength: 1 },
        })
      );
      expect(received.length).toBe(1);
    });
  });

  describe('Policy isolate', () => {
    it('UserOptOutPolicy: deny solo se userId in optedOutUserIds', () => {
      const policy = new UserOptOutPolicy();
      const ctxAllow: PrivacyContext = {
        optedOutUserIds: new Set(),
        isolatedContextIds: new Set(),
        guardDisabled: false,
        getUserIdFromEvent: () => 'u-1',
      };
      expect(policy.evaluate(event({ eventType: 'X' }), ctxAllow)).toBe('allow');
      const ctxDeny: PrivacyContext = {
        optedOutUserIds: new Set(['u-1']),
        isolatedContextIds: new Set(),
        guardDisabled: false,
        getUserIdFromEvent: () => 'u-1',
      };
      expect(policy.evaluate(event({ eventType: 'X' }), ctxDeny)).toBe('deny');
    });

    it('ContextIsolationPolicy: deny solo se contextId in isolatedContextIds', () => {
      const policy = new ContextIsolationPolicy();
      const ctxDeny: PrivacyContext = {
        optedOutUserIds: new Set(),
        isolatedContextIds: new Set(['t-1']),
        guardDisabled: false,
        getContextIdFromEvent: () => 't-1',
      };
      expect(policy.evaluate(event({ eventType: 'MessageSent' }), ctxDeny)).toBe('deny');
    });
  });
});
