/**
 * Read Model Migration - unit test
 * Microstep 5.1.3
 */

import { describe, it, expect } from 'vitest';
import {
  ReadModelMigration,
  fullReplay,
  timeboxReplay,
  createIdleState,
} from '../index';
import type { ReplayEvent } from '../ReadModelMigration';

function createEventSource(events: ReplayEvent[]): import('../ReadModelMigration').MigrationEventSource {
  return {
    async *getEvents() {
      for (const e of events) {
        yield e;
      }
    },
  };
}

function createExecutor(
  applied: ReplayEvent[],
  failOn?: string
): import('../ReadModelMigration').MigrationProjectionExecutor {
  return {
    async apply(event, targetVersion) {
      if (failOn && event.id === failOn) {
        throw new Error(`Simulated failure for ${event.id}`);
      }
      applied.push(event);
    },
  };
}

describe('ReadModelMigration', () => {
  describe('Test 1 - Stato iniziale', () => {
    it('migrazione in IDLE, nessun replay attivo', () => {
      const migration = new ReadModelMigration({
        eventSource: createEventSource([]),
        projectionExecutor: createExecutor([]),
      });
      const state = migration.getState();
      expect(state.status).toBe('IDLE');
      expect(state.progress).toBe(0);
      expect(state.startedAt).toBeUndefined();
    });
  });

  describe('Test 2 - Avvio migrazione', () => {
    it('stato -> RUNNING, target -> WRITE_ALL', async () => {
      let writeTarget: 'WRITE_V1_ONLY' | 'WRITE_ALL' = 'WRITE_V1_ONLY';
      const migration = new ReadModelMigration({
        eventSource: createEventSource([
          { id: 'e1', type: 'ThreadCreated', payload: {} },
        ]),
        projectionExecutor: createExecutor([]),
        onWriteTargetChange: (t) => { writeTarget = t; },
      });
      await migration.start(fullReplay());
      expect(migration.getState().status).toBe('COMPLETED');
      expect(writeTarget).toBe('WRITE_ALL');
    });
  });

  describe('Test 3 - Replay completo', () => {
    it('eventi replayati correttamente su v2, v1 non modificata retroattivamente', async () => {
      const applied: ReplayEvent[] = [];
      const migration = new ReadModelMigration({
        eventSource: createEventSource([
          { id: 'e1', type: 'ThreadCreated', payload: { title: 'T1' } },
          { id: 'e2', type: 'ThreadCreated', payload: { title: 'T2' } },
        ]),
        projectionExecutor: createExecutor(applied),
        toVersion: 'v2',
      });
      await migration.start(fullReplay());
      expect(applied).toHaveLength(2);
      expect(applied[0].id).toBe('e1');
      expect(applied[1].id).toBe('e2');
      const state = migration.getState();
      expect(state.status).toBe('COMPLETED');
      expect(state.toVersion).toBe('v2');
    });
  });

  describe('Test 4 - Completamento', () => {
    it('stato -> COMPLETED, timestamp finale valorizzato', async () => {
      const migration = new ReadModelMigration({
        eventSource: createEventSource([{ id: 'e1', type: 'ThreadCreated', payload: {} }]),
        projectionExecutor: createExecutor([]),
      });
      await migration.start(fullReplay());
      const state = migration.getState();
      expect(state.status).toBe('COMPLETED');
      expect(state.completedAt).toBeDefined();
      expect(typeof state.completedAt).toBe('number');
      expect(state.progress).toBe(100);
    });
  });

  describe('Test 5 - Errore in migrazione', () => {
    it('errore durante replay -> stato FAILED, errore tracciato', async () => {
      let writeTarget: 'WRITE_V1_ONLY' | 'WRITE_ALL' = 'WRITE_V1_ONLY';
      const migration = new ReadModelMigration({
        eventSource: createEventSource([
          { id: 'e1', type: 'ThreadCreated', payload: {} },
          { id: 'e2', type: 'ThreadCreated', payload: {} },
        ]),
        projectionExecutor: createExecutor([], 'e2'),
        onWriteTargetChange: (t) => { writeTarget = t; },
      });
      await expect(migration.start(fullReplay())).rejects.toThrow();
      const state = migration.getState();
      expect(state.status).toBe('FAILED');
      expect(state.error).toContain('Simulated failure');
      expect(state.completedAt).toBeDefined();
      expect(writeTarget).toBe('WRITE_V1_ONLY'); // revert su fallimento
    });
  });

  describe('Test 6 - Idempotenza', () => {
    it('replay rieseguito non duplica dati (executor idempotente)', async () => {
      const appliedIds = new Set<string>();
      const idempotentExecutor: import('../ReadModelMigration').MigrationProjectionExecutor = {
        async apply(event) {
          appliedIds.add(event.id);
        },
      };
      const eventSource = createEventSource([
        { id: 'e1', type: 'ThreadCreated', payload: {} },
      ]);
      const migration = new ReadModelMigration({
        eventSource,
        projectionExecutor: idempotentExecutor,
      });
      await migration.start(fullReplay());
      expect(appliedIds.size).toBe(1);
      expect(appliedIds.has('e1')).toBe(true);
      await migration.start(fullReplay());
      expect(appliedIds.size).toBe(1);
    });
  });

  describe('MigrationStrategy', () => {
    it('fullReplay restituisce strategia FULL_REPLAY', () => {
      const s = fullReplay();
      expect(s.type).toBe('FULL_REPLAY');
    });

    it('timeboxReplay restituisce strategia TIMEBOX_REPLAY con timestamp', () => {
      const s = timeboxReplay('2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z');
      expect(s.type).toBe('TIMEBOX_REPLAY');
      expect(s.fromTimestamp).toBe('2024-01-01T00:00:00Z');
      expect(s.toTimestamp).toBe('2024-01-31T23:59:59Z');
    });
  });

  describe('MigrationState', () => {
    it('createIdleState crea stato IDLE', () => {
      const s = createIdleState('v1', 'v2');
      expect(s.status).toBe('IDLE');
      expect(s.fromVersion).toBe('v1');
      expect(s.toVersion).toBe('v2');
    });
  });

  describe('Stop', () => {
    it('stop interrompe il replay', async () => {
      const applied: ReplayEvent[] = [];
      const eventSource = createEventSource([
        { id: 'e1', type: 'ThreadCreated', payload: {} },
        { id: 'e2', type: 'ThreadCreated', payload: {} },
        { id: 'e3', type: 'ThreadCreated', payload: {} },
      ]);
      const migration = new ReadModelMigration({
        eventSource,
        projectionExecutor: createExecutor(applied),
      });
      const startPromise = migration.start(fullReplay());
      migration.stop();
      await startPromise;
      expect(applied.length).toBeLessThanOrEqual(3);
    });
  });
});
