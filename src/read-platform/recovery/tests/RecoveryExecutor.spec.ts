/**
 * Recovery Executor - unit test
 * Microstep 5.2.3
 */

import { describe, it, expect } from 'vitest';
import { RecoveryExecutor, type ReplayCommand } from '../index';
import { InMemoryReadDLQ, type ReadDLQEntry } from '../../dlq';
import type { MigrationProjectionExecutor } from '../../migrations/ReadModelMigration';

function createEntry(overrides: Partial<ReadDLQEntry> = {}): ReadDLQEntry {
  return {
    eventId: 'e1',
    eventType: 'ThreadCreated',
    payload: { title: 'T1' },
    targetVersion: 'v2',
    errorMessage: 'simulated',
    timestamp: Date.now(),
    context: 'live',
    ...overrides,
  };
}

describe('RecoveryExecutor', () => {
  describe('Test 1 - Dry run', () => {
    it('nessuna projection applicata, DLQ invariata, risultato coerente', async () => {
      const dlq = new InMemoryReadDLQ();
      await dlq.enqueue(createEntry({ eventId: 'e1' }));
      const applied: string[] = [];
      const executor: MigrationProjectionExecutor = {
        async apply(event) {
          applied.push(event.id);
        },
      };
      const recovery = new RecoveryExecutor({ dlq, projectionExecutor: executor });
      const cmd: ReplayCommand = {
        provenance: { source: 'DLQ' },
        targetVersion: 'v2',
        mode: 'DRY_RUN',
      };
      const result = await recovery.execute(cmd);
      expect(result.mode).toBe('DRY_RUN');
      expect(result.attempted).toEqual(['e1']);
      expect(result.recovered).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(applied).toHaveLength(0);
      const stillInDlq = await dlq.getByEventId('e1');
      expect(stillInDlq).toBeDefined();
    });
  });

  describe('Test 2 - Recovery singolo evento', () => {
    it('evento applicato, rimosso da DLQ', async () => {
      const dlq = new InMemoryReadDLQ();
      await dlq.enqueue(createEntry({ eventId: 'e1' }));
      const executor: MigrationProjectionExecutor = {
        async apply() {},
      };
      const recovery = new RecoveryExecutor({ dlq, projectionExecutor: executor });
      const result = await recovery.execute({
        provenance: { source: 'DLQ' },
        targetVersion: 'v2',
        mode: 'EXECUTE',
      });
      expect(result.recovered).toEqual(['e1']);
      expect(result.failed).toEqual([]);
      const stillInDlq = await dlq.getByEventId('e1');
      expect(stillInDlq).toBeUndefined();
    });
  });

  describe('Test 3 - Recovery multipla', () => {
    it('piu eventi dalla DLQ, risultati parziali corretti', async () => {
      const dlq = new InMemoryReadDLQ();
      await dlq.enqueue(createEntry({ eventId: 'e1' }));
      await dlq.enqueue(createEntry({ eventId: 'e2' }));
      await dlq.enqueue(createEntry({ eventId: 'e3' }));
      const executor: MigrationProjectionExecutor = {
        async apply(event) {
          if (event.id === 'e2') throw new Error('fail e2');
        },
      };
      const recovery = new RecoveryExecutor({ dlq, projectionExecutor: executor });
      const result = await recovery.execute({
        provenance: { source: 'DLQ' },
        targetVersion: 'v2',
        mode: 'EXECUTE',
      });
      expect(result.attempted).toHaveLength(3);
      expect(result.recovered).toContain('e1');
      expect(result.recovered).toContain('e3');
      expect(result.failed).toEqual(['e2']);
      expect(result.errors['e2']).toBe('fail e2');
      expect(await dlq.getByEventId('e1')).toBeUndefined();
      expect(await dlq.getByEventId('e2')).toBeDefined();
      expect(await dlq.getByEventId('e3')).toBeUndefined();
    });
  });

  describe('Test 4 - Errore durante recovery', () => {
    it('evento resta in DLQ, errore tracciato nel result', async () => {
      const dlq = new InMemoryReadDLQ();
      await dlq.enqueue(createEntry({ eventId: 'e1' }));
      const executor: MigrationProjectionExecutor = {
        async apply() {
          throw new Error('projection error');
        },
      };
      const recovery = new RecoveryExecutor({ dlq, projectionExecutor: executor });
      const result = await recovery.execute({
        provenance: { source: 'DLQ' },
        targetVersion: 'v2',
        mode: 'EXECUTE',
      });
      expect(result.recovered).toEqual([]);
      expect(result.failed).toEqual(['e1']);
      expect(result.errors['e1']).toBe('projection error');
      expect(await dlq.getByEventId('e1')).toBeDefined();
    });
  });

  describe('Test 5 - Idempotenza', () => {
    it('replay ripetuto non duplica effetti', async () => {
      const dlq = new InMemoryReadDLQ();
      await dlq.enqueue(createEntry({ eventId: 'e1' }));
      const applied: string[] = [];
      const executor: MigrationProjectionExecutor = {
        async apply(event) {
          applied.push(event.id);
        },
      };
      const recovery = new RecoveryExecutor({ dlq, projectionExecutor: executor });
      await recovery.execute({
        provenance: { source: 'DLQ' },
        targetVersion: 'v2',
        mode: 'EXECUTE',
      });
      expect(applied).toEqual(['e1']);
      expect(await dlq.getByEventId('e1')).toBeUndefined();
      const result2 = await recovery.execute({
        provenance: { source: 'DLQ' },
        targetVersion: 'v2',
        mode: 'EXECUTE',
      });
      expect(result2.attempted).toEqual([]);
      expect(applied).toEqual(['e1']);
    });
  });

  describe('Test 6 - Compatibilita migrazione', () => {
    it('recovery verso targetVersion specifica', async () => {
      const dlq = new InMemoryReadDLQ();
      await dlq.enqueue(createEntry({ eventId: 'e1', targetVersion: 'v1' }));
      let receivedVersion = '';
      const executor: MigrationProjectionExecutor = {
        async apply(_event, targetVersion) {
          receivedVersion = targetVersion;
        },
      };
      const recovery = new RecoveryExecutor({ dlq, projectionExecutor: executor });
      await recovery.execute({
        provenance: { source: 'DLQ' },
        targetVersion: 'v2',
        mode: 'EXECUTE',
      });
      expect(receivedVersion).toBe('v2');
    });
  });
});
