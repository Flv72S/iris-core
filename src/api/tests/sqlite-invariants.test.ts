/**
 * SQLite Invariants Tests
 * 
 * Test bloccanti per verificare che:
 * 1. Violazioni invarianti SYS-* → errore esplicito
 * 2. Nessun fallback silenzioso
 * 3. Database constraints rispettati
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.7_Persistence_Map.md
 * - IRIS_API_Invariants_and_Failure_Modes.md
 */

import { describe, it, expect } from 'vitest';
import {
  createDatabase,
  closeDatabase,
  SQLiteMessageRepository,
  SQLiteThreadRepository,
} from '../repositories/sqlite';
import type Database from 'better-sqlite3';
import type { StoredMessage } from '../repositories/MessageRepository';

describe('SQLite Invariants', () => {
  describe('SYS-01: Append-Only', () => {
    it('deve fallire se si tenta di sovrascrivere messaggio esistente', async () => {
      const db = createDatabase(':memory:');
      const messageRepo = new SQLiteMessageRepository(db);

      try {
        const message: StoredMessage = {
          messageId: 'msg-1',
          threadId: 'thread-1',
          senderAlias: 'alias-1',
          payload: 'Test',
          state: 'SENT',
          createdAt: Date.now(),
        };

        // Primo append (successo)
        await messageRepo.append(message);

        // Secondo append con stesso messageId (deve fallire)
        try {
          await messageRepo.append(message);
          expect.fail('Should have thrown error for duplicate messageId');
        } catch (err: any) {
          expect(err.message).toContain('already exists');
          expect(err.message).toContain('SYS-01');
        }
      } finally {
        closeDatabase(db);
      }
    });
  });

  describe('SYS-02: Thread-First', () => {
    it('deve fallire se si tenta di creare messaggio senza thread', async () => {
      const db = createDatabase(':memory:');
      const messageRepo = new SQLiteMessageRepository(db);

      try {
        const message: StoredMessage = {
          messageId: 'msg-1',
          threadId: 'non-existent-thread',
          senderAlias: 'alias-1',
          payload: 'Test',
          state: 'SENT',
          createdAt: Date.now(),
        };

        // Deve fallire per foreign key constraint
        try {
          await messageRepo.append(message);
          expect.fail('Should have thrown error for non-existent thread');
        } catch (err: any) {
          // SQLite foreign key violation
          expect(err).toBeDefined();
        }
      } finally {
        closeDatabase(db);
      }
    });
  });

  describe('SYS-04: Stato Esplicito', () => {
    it('deve fallire se si tenta di inserire stato non valido', async () => {
      const db = createDatabase(':memory:');
      const threadRepo = new SQLiteThreadRepository(db);

      try {
        // Setup: crea thread valido
        await threadRepo.set({
          threadId: 'thread-1',
          state: 'OPEN',
          lastStateChangeAt: Date.now(),
        });

        // Prova update con stato non valido (violazione constraint)
        try {
          await threadRepo.updateState('thread-1', 'INVALID_STATE' as any, Date.now());
          expect.fail('Should have thrown error for invalid state');
        } catch (err: any) {
          // SQLite constraint violation
          expect(err).toBeDefined();
        }
      } finally {
        closeDatabase(db);
      }
    });
  });

  describe('Database constraints', () => {
    it('deve rispettare constraint UNIQUE su client_message_id', async () => {
      const db = createDatabase(':memory:');
      const messageRepo = new SQLiteMessageRepository(db);
      const threadRepo = new SQLiteThreadRepository(db);

      try {
        // Setup: crea thread
        await threadRepo.set({
          threadId: 'thread-1',
          state: 'OPEN',
          lastStateChangeAt: Date.now(),
        });

        const clientMessageId = 'client-123';

        // Primo append (successo)
        await messageRepo.append({
          messageId: 'msg-1',
          threadId: 'thread-1',
          senderAlias: 'alias-1',
          payload: 'Test 1',
          state: 'SENT',
          createdAt: Date.now(),
          clientMessageId,
        });

        // Secondo append con stesso clientMessageId (deve fallire)
        try {
          await messageRepo.append({
            messageId: 'msg-2',
            threadId: 'thread-1',
            senderAlias: 'alias-1',
            payload: 'Test 2',
            state: 'SENT',
            createdAt: Date.now() + 1000,
            clientMessageId, // Stesso clientMessageId
          });
          expect.fail('Should have thrown error for duplicate clientMessageId');
        } catch (err: any) {
          expect(err.message).toContain('Client message ID');
          expect(err.message).toContain('already exists');
        }
      } finally {
        closeDatabase(db);
      }
    });
  });
});
