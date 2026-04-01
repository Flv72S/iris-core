/**
 * SQLite Thread Repository Implementation
 * 
 * Implementazione persistence reale con SQLite.
 * 
 * Vincoli:
 * - Nessuna logica di dominio
 * - Nessuna semantica
 * - SQL esplicito
 * - Errori dichiarativi
 * 
 * Riferimenti vincolanti:
 * - src/api/repositories/ThreadRepository.ts
 * - IRIS_STEP5.7_Persistence_Map.md
 */

import type {
  ThreadRepository,
  StoredThread,
} from '../ThreadRepository';
import type { ThreadState } from '../../core/types';
import type Database from 'better-sqlite3';

/**
 * SQLite Thread Repository
 * 
 * Implementazione deterministica:
 * - SQL esplicito
 * - Nessun ORM
 * - Nessuna trasformazione semantica
 */
export class SQLiteThreadRepository implements ThreadRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.prepareStatements();
  }

  private existsStmt!: Database.Statement;
  private getStmt!: Database.Statement;
  private setStmt!: Database.Statement;
  private updateStateStmt!: Database.Statement;
  private getStateStmt!: Database.Statement;

  /**
   * Prepara statement SQL (performance)
   */
  private prepareStatements(): void {
    // EXISTS (SQLite-compatible): ritorna 1 riga se esiste, 0 righe se non esiste
    this.existsStmt = this.db.prepare(`
      SELECT 1 as exists FROM threads WHERE id = ? LIMIT 1
    `);

    // SELECT thread by id
    this.getStmt = this.db.prepare(`
      SELECT 
        id as threadId,
        state,
        last_state_change_at as lastStateChangeAt
      FROM threads
      WHERE id = ?
    `);

    // INSERT OR REPLACE thread
    this.setStmt = this.db.prepare(`
      INSERT OR REPLACE INTO threads (
        id, state, last_state_change_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `);

    // UPDATE thread state
    this.updateStateStmt = this.db.prepare(`
      UPDATE threads
      SET state = ?, last_state_change_at = ?, updated_at = ?
      WHERE id = ?
    `);

    // SELECT thread state
    this.getStateStmt = this.db.prepare(`
      SELECT state FROM threads WHERE id = ?
    `);
  }

  async exists(threadId: string): Promise<boolean> {
    const result = this.existsStmt.get(threadId) as { exists: number } | undefined;
    return !!result && result.exists === 1;
  }

  async get(threadId: string): Promise<StoredThread | null> {
    const row = this.getStmt.get(threadId) as any;
    if (!row) {
      return null;
    }

    return {
      threadId: row.threadId,
      state: row.state as ThreadState,
      lastStateChangeAt: row.lastStateChangeAt,
    };
  }

  async set(thread: StoredThread): Promise<void> {
    const now = Date.now();
    this.setStmt.run(
      thread.threadId,
      thread.state,
      thread.lastStateChangeAt,
      now, // created_at (se nuovo) o updated_at (se esiste)
      now  // updated_at
    );
  }

  async updateState(threadId: string, newState: ThreadState, transitionedAt: number): Promise<void> {
    const result = this.updateStateStmt.run(
      newState,
      transitionedAt,
      Date.now(), // updated_at
      threadId
    );

    if (result.changes === 0) {
      throw new Error(`Thread ${threadId} not found`);
    }
  }

  async getState(threadId: string): Promise<ThreadState | null> {
    const row = this.getStateStmt.get(threadId) as any;
    if (!row) {
      return null;
    }

    return row.state as ThreadState;
  }
}
