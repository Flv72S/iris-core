/**
 * Read DLQ - unit test
 * Microstep 5.2.2
 */

import { describe, it, expect } from 'vitest';
import { InMemoryReadDLQ, type ReadDLQEntry } from '../index';

function createEntry(overrides: Partial<ReadDLQEntry> = {}): ReadDLQEntry {
  return {
    eventId: 'e1',
    eventType: 'ThreadCreated',
    payload: { title: 'T1' },
    targetVersion: 'v2',
    errorMessage: 'simulated failure',
    errorStack: 'Error: simulated\n  at ...',
    timestamp: Date.now(),
    context: 'live',
    ...overrides,
  };
}

describe('ReadDLQ', () => {
  describe('Test 1 - Enqueue', () => {
    it('evento fallito -> entry salvata correttamente', async () => {
      const dlq = new InMemoryReadDLQ();
      const entry = createEntry();
      await dlq.enqueue(entry);
      const all = await dlq.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].eventId).toBe('e1');
      expect(all[0].eventType).toBe('ThreadCreated');
      expect(all[0].targetVersion).toBe('v2');
      expect(all[0].context).toBe('live');
    });
  });

  describe('Test 2 - Recupero', () => {
    it('getAll() restituisce le entry', async () => {
      const dlq = new InMemoryReadDLQ();
      await dlq.enqueue(createEntry({ eventId: 'e1' }));
      await dlq.enqueue(createEntry({ eventId: 'e2', eventType: 'MessageAdded' }));
      const all = await dlq.getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('Test 3 - Lookup per evento', () => {
    it('getByEventId(eventId) restituisce entry corretta', async () => {
      const dlq = new InMemoryReadDLQ();
      const entry = createEntry({ eventId: 'ev-123' });
      await dlq.enqueue(entry);
      const found = await dlq.getByEventId('ev-123');
      expect(found).toBeDefined();
      expect(found!.eventId).toBe('ev-123');
      expect(found!.eventType).toBe('ThreadCreated');
    });

    it('getByEventId su id inesistente -> undefined', async () => {
      const dlq = new InMemoryReadDLQ();
      const found = await dlq.getByEventId('missing');
      expect(found).toBeUndefined();
    });
  });

  describe('Test 4 - Rimozione', () => {
    it('remove(eventId) elimina entry', async () => {
      const dlq = new InMemoryReadDLQ();
      await dlq.enqueue(createEntry({ eventId: 'e1' }));
      await dlq.remove('e1');
      const found = await dlq.getByEventId('e1');
      expect(found).toBeUndefined();
      const all = await dlq.getAll();
      expect(all).toHaveLength(0);
    });
  });

  describe('Test 5 - Nessun side-effect', () => {
    it('enqueue non blocca ne lancia errori', async () => {
      const dlq = new InMemoryReadDLQ();
      await expect(dlq.enqueue(createEntry())).resolves.toBeUndefined();
    });
  });

  describe('Test 6 - Compatibilita replay', () => {
    it('entry include contesto replay/migration', async () => {
      const dlq = new InMemoryReadDLQ();
      await dlq.enqueue(createEntry({ eventId: 'replay-e1', context: 'replay' }));
      await dlq.enqueue(createEntry({ eventId: 'mig-e1', context: 'migration' }));
      const all = await dlq.getAll();
      const replay = all.find((e) => e.eventId === 'replay-e1');
      const mig = all.find((e) => e.eventId === 'mig-e1');
      expect(replay?.context).toBe('replay');
      expect(mig?.context).toBe('migration');
    });
  });
});
