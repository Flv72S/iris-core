/**
 * SQLite Idempotency Tests
 * 
 * Test bloccanti per verificare che:
 * 1. clientMessageId duplicato → errore esplicito
 * 2. Nessun fallback silenzioso
 * 3. Idempotenza gestita correttamente
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.7_Persistence_Map.md
 * - Invariante SYS-01 (Append-Only)
 */

import { describe, it, expect } from 'vitest';
import { MessagingBoundary } from '../boundary/MessagingBoundary';
import {
  createDatabase,
  closeDatabase,
  SQLiteMessageRepository,
  SQLiteThreadRepository,
  SQLiteSyncStatusRepository,
  SQLiteOfflineQueueRepository,
  SQLiteRateLimitRepository,
  SQLiteAliasRepository,
} from '../repositories/sqlite';
import type Database from 'better-sqlite3';

/**
 * Crea Boundary con repository SQLite
 */
function createSQLiteBoundary(): { boundary: MessagingBoundary; db: Database.Database } {
  const db = createDatabase(':memory:');
  const messageRepo = new SQLiteMessageRepository(db);
  const threadRepo = new SQLiteThreadRepository(db);
  const aliasRepo = new SQLiteAliasRepository(db);
  aliasRepo.addAlias('test-alias');
  const rateLimitRepo = new SQLiteRateLimitRepository(db);
  const offlineQueueRepo = new SQLiteOfflineQueueRepository(db);
  const syncStatusRepo = new SQLiteSyncStatusRepository(db);

  const boundary = new MessagingBoundary(
    messageRepo,
    threadRepo,
    aliasRepo,
    rateLimitRepo,
    offlineQueueRepo,
    syncStatusRepo
  );

  return { boundary, db };
}

describe('SQLite Idempotency', () => {
  describe('clientMessageId duplicate', () => {
    it('deve fallire con errore esplicito se clientMessageId duplicato', async () => {
      const { boundary, db } = createSQLiteBoundary();

      try {
        const threadId = 'test-thread';
        const clientMessageId = 'client-msg-123';
        const now = Date.now();

        // Setup: crea thread
        const threadRepo = new SQLiteThreadRepository(db);
        await threadRepo.set({
          threadId,
          state: 'OPEN',
          lastStateChangeAt: now,
        });

        // Primo append (successo)
        const firstResult = await boundary.appendMessage({
          threadId,
          senderAlias: 'test-alias',
          payload: 'First message',
          clientMessageId,
        });

        expect('messageId' in firstResult).toBe(true);

        // Secondo append con stesso clientMessageId (deve fallire)
        const secondResult = await boundary.appendMessage({
          threadId,
          senderAlias: 'test-alias',
          payload: 'Second message',
          clientMessageId, // Stesso clientMessageId
        });

        // Deve essere un errore
        expect('code' in secondResult).toBe(true);
        if ('code' in secondResult) {
          // Verifica che l'errore sia esplicito
          expect(secondResult.code).toBeDefined();
          expect(secondResult.message).toContain('client');
        }
      } finally {
        closeDatabase(db);
      }
    });
  });

  describe('messageId duplicate', () => {
    it('deve fallire con errore esplicito se messageId duplicato', async () => {
      const { boundary, db } = createSQLiteBoundary();

      try {
        const threadId = 'test-thread';
        const now = Date.now();

        // Setup: crea thread
        const threadRepo = new SQLiteThreadRepository(db);
        await threadRepo.set({
          threadId,
          state: 'OPEN',
          lastStateChangeAt: now,
        });

        // Primo append (successo)
        const firstResult = await boundary.appendMessage({
          threadId,
          senderAlias: 'test-alias',
          payload: 'First message',
        });

        expect('messageId' in firstResult).toBe(true);
        const messageId = 'messageId' in firstResult ? firstResult.messageId : '';

        // Prova append diretto con stesso messageId (violazione SYS-01)
        const messageRepo = new SQLiteMessageRepository(db);
        try {
          await messageRepo.append({
            messageId,
            threadId,
            senderAlias: 'test-alias',
            payload: 'Duplicate',
            state: 'SENT',
            createdAt: now + 1000,
          });
          expect.fail('Should have thrown error for duplicate messageId');
        } catch (err: any) {
          // Verifica che l'errore sia esplicito
          expect(err.message).toContain('already exists');
          expect(err.message).toContain('SYS-01');
        }
      } finally {
        closeDatabase(db);
      }
    });
  });
});
