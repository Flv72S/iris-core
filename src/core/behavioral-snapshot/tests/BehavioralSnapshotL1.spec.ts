/**
 * Behavioral Snapshot Level 1 — test (6.2.2)
 *
 * Test di invarianza MVP, dipendenza corretta, neutralità, degradazione.
 */

import { describe, it, expect } from 'vitest';
import {
  InMemoryBehavioralSnapshotL0Reader,
  InMemoryBehavioralSnapshotL1Store,
  NoOpBehavioralSnapshotL1Store,
  SnapshotDeriverLevel1,
} from '../index';

describe('Behavioral Snapshot Level 1 (6.2.2)', () => {
  describe('Test di invarianza MVP', () => {
    it('Snapshot L1 attivo vs NoOp: stesso output, stato, side-effect (deriver non tocca dominio)', () => {
      const l0Reader = new InMemoryBehavioralSnapshotL0Reader();
      l0Reader.setThreadSnapshot('t-1', {
        messageCount: 10,
        avgMessageLength: 50,
        lastMessageTimestamp: Date.now() - 1000,
        rawFrequency: 5,
        chatType: '1-to-1',
      });

      const l1StoreReal = new InMemoryBehavioralSnapshotL1Store();
      const l1StoreNoOp = new NoOpBehavioralSnapshotL1Store();

      const deriverReal = new SnapshotDeriverLevel1(l0Reader, l1StoreReal);
      const deriverNoOp = new SnapshotDeriverLevel1(l0Reader, l1StoreNoOp);

      deriverReal.derive();
      deriverNoOp.derive();

      expect(l1StoreReal.getThreadSnapshotForTest('t-1')).not.toBeNull();
      expect(() => deriverNoOp.derive()).not.toThrow();
    });

    it('deriver.derive() non modifica stato di dominio né output use case', () => {
      const l0Reader = new InMemoryBehavioralSnapshotL0Reader();
      const l1Store = new InMemoryBehavioralSnapshotL1Store();
      const deriver = new SnapshotDeriverLevel1(l0Reader, l1Store);
      deriver.derive();
      expect(() => deriver.derive()).not.toThrow();
    });
  });

  describe('Test di dipendenza corretta', () => {
    it('Livello 1 legge solo dal Livello 0', () => {
      const l0Reader = new InMemoryBehavioralSnapshotL0Reader();
      l0Reader.setThreadSnapshot('t-1', {
        messageCount: 2,
        avgMessageLength: 10,
        lastMessageTimestamp: 1000,
        rawFrequency: 1,
        chatType: '1-to-1',
      });
      const l1Store = new InMemoryBehavioralSnapshotL1Store();
      const deriver = new SnapshotDeriverLevel1(l0Reader, l1Store);
      deriver.derive();
      const snap = l1Store.getThreadSnapshotForTest('t-1');
      expect(snap).not.toBeNull();
      expect(typeof snap!.normalizedFrequency).toBe('number');
      expect(typeof snap!.technicalInactivityMs).toBe('number');
    });

    it('nessuna dipendenza inversa: L0 reader senza getKnownThreadIds resterebbe incompleto (contratto)', () => {
      const l0Reader = new InMemoryBehavioralSnapshotL0Reader();
      expect(l0Reader.getKnownThreadIds()).toEqual([]);
      expect(l0Reader.getKnownUserIds()).toEqual([]);
    });

    it('nessun accesso diretto a eventi o dominio: deriver non riceve dispatcher né domain', () => {
      const l0Reader = new InMemoryBehavioralSnapshotL0Reader();
      const l1Store = new NoOpBehavioralSnapshotL1Store();
      const deriver = new SnapshotDeriverLevel1(l0Reader, l1Store);
      expect(deriver).toBeDefined();
      deriver.derive();
    });
  });

  describe('Test di neutralità', () => {
    it('nessuna etichetta semantica nei dati L1: solo numeri', () => {
      const l0Reader = new InMemoryBehavioralSnapshotL0Reader();
      l0Reader.setThreadSnapshot('t-1', {
        messageCount: 5,
        avgMessageLength: 20,
        lastMessageTimestamp: Date.now(),
        rawFrequency: 3,
        chatType: 'gruppo',
      });
      const l1Store = new InMemoryBehavioralSnapshotL1Store();
      const deriver = new SnapshotDeriverLevel1(l0Reader, l1Store);
      deriver.derive();
      const snap = l1Store.getThreadSnapshotForTest('t-1');
      expect(snap).not.toBeNull();
      expect(typeof snap!.normalizedFrequency).toBe('number');
      expect(typeof snap!.temporalDensity).toBe('number');
      expect(typeof snap!.frequencyDelta).toBe('number');
      expect(typeof snap!.technicalInactivityMs).toBe('number');
    });

    it('UserSnapshotL1: solo numeri e distribuzione percentuale', () => {
      const l0Reader = new InMemoryBehavioralSnapshotL0Reader();
      l0Reader.setUserSnapshot('u-1', {
        messageCount: 10,
        lastActivityTimestamp: Date.now() - 5000,
        bucketCounts: [2, 3, 5],
        activeThreadCount: 2,
      });
      const l1Store = new InMemoryBehavioralSnapshotL1Store();
      const deriver = new SnapshotDeriverLevel1(l0Reader, l1Store);
      deriver.derive();
      const snap = l1Store.getUserSnapshotForTest('u-1');
      expect(snap).not.toBeNull();
      expect(Array.isArray(snap!.bucketDistributionPercent)).toBe(true);
      expect(snap!.bucketDistributionPercent.every((n) => typeof n === 'number')).toBe(true);
    });
  });

  describe('Test di degradazione', () => {
    it('se Livello 0 è vuoto: Livello 1 non rompe nulla', () => {
      const l0Reader = new InMemoryBehavioralSnapshotL0Reader();
      const l1Store = new InMemoryBehavioralSnapshotL1Store();
      const deriver = new SnapshotDeriverLevel1(l0Reader, l1Store);
      expect(() => deriver.derive()).not.toThrow();
      expect(l1Store.getThreadSnapshotForTest('t-1')).toBeNull();
    });

    it('se L0 reader getKnownThreadIds lancia: deriver non propaga', () => {
      const l0Reader: import('../level0-reader').BehavioralSnapshotL0Reader = {
        getThreadSnapshot: () => null,
        getUserSnapshot: () => null,
        getKnownThreadIds: () => {
          throw new Error('L0 unavailable');
        },
        getKnownUserIds: () => [],
      };
      const l1Store = new NoOpBehavioralSnapshotL1Store();
      const deriver = new SnapshotDeriverLevel1(l0Reader, l1Store);
      expect(() => deriver.derive()).not.toThrow();
    });

    it('NoOpBehavioralSnapshotL1Store: derive con NoOp non scrive nulla', () => {
      const l0Reader = new InMemoryBehavioralSnapshotL0Reader();
      l0Reader.setThreadSnapshot('t-1', {
        messageCount: 1,
        avgMessageLength: 5,
        lastMessageTimestamp: Date.now(),
        rawFrequency: 1,
        chatType: '1-to-1',
      });
      const l1StoreNoOp = new NoOpBehavioralSnapshotL1Store();
      const deriver = new SnapshotDeriverLevel1(l0Reader, l1StoreNoOp);
      deriver.derive();
      expect('getThreadSnapshotForTest' in l1StoreNoOp).toBe(false);
    });
  });

  describe('Deriver: trasformazioni consentite', () => {
    it('frequencyDelta: differenza rispetto a snapshot precedente', () => {
      const l0Reader = new InMemoryBehavioralSnapshotL0Reader();
      const l1Store = new InMemoryBehavioralSnapshotL1Store();
      const deriver = new SnapshotDeriverLevel1(l0Reader, l1Store);
      l0Reader.setThreadSnapshot('t-1', {
        messageCount: 5,
        avgMessageLength: 10,
        lastMessageTimestamp: 1000,
        rawFrequency: 5,
        chatType: '1-to-1',
      });
      deriver.derive();
      const first = l1Store.getThreadSnapshotForTest('t-1');
      expect(first!.frequencyDelta).toBe(0);
      l0Reader.setThreadSnapshot('t-1', {
        messageCount: 8,
        avgMessageLength: 12,
        lastMessageTimestamp: 2000,
        rawFrequency: 8,
        chatType: '1-to-1',
      });
      deriver.derive();
      const second = l1Store.getThreadSnapshotForTest('t-1');
      expect(second!.frequencyDelta).toBe(3);
    });

    it('bucketDistributionPercent: distribuzione percentuale su bucket', () => {
      const l0Reader = new InMemoryBehavioralSnapshotL0Reader();
      l0Reader.setUserSnapshot('u-1', {
        messageCount: 10,
        lastActivityTimestamp: Date.now(),
        bucketCounts: [1, 2, 2],
        activeThreadCount: 1,
      });
      const l1Store = new InMemoryBehavioralSnapshotL1Store();
      const deriver = new SnapshotDeriverLevel1(l0Reader, l1Store);
      deriver.derive();
      const snap = l1Store.getUserSnapshotForTest('u-1');
      expect(snap).not.toBeNull();
      const sum = snap!.bucketDistributionPercent.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(100, 5);
    });
  });
});
