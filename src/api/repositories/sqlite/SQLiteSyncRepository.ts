/**
 * SQLite Sync Repository Implementation
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
 * - src/api/repositories/SyncRepository.ts
 * - IRIS_STEP5.7_Persistence_Map.md
 */

import type {
  SyncStatusRepository,
  OfflineQueueRepository,
  RateLimitRepository,
  AliasRepository,
} from '../SyncRepository';
import type { InternalMessage } from '../../core/types';
import type Database from 'better-sqlite3';

/**
 * SQLite Sync Status Repository
 */
export class SQLiteSyncStatusRepository implements SyncStatusRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.prepareStatements();
  }

  private getLastSyncAtStmt!: Database.Statement;
  private setLastSyncAtStmt!: Database.Statement;
  private getEstimatedLatencyStmt!: Database.Statement;
  private setEstimatedLatencyStmt!: Database.Statement;

  private prepareStatements(): void {
    this.getLastSyncAtStmt = this.db.prepare(`
      SELECT last_sync_at as lastSyncAt FROM sync_status WHERE id = 1
    `);

    this.setLastSyncAtStmt = this.db.prepare(`
      UPDATE sync_status SET last_sync_at = ? WHERE id = 1
    `);

    this.getEstimatedLatencyStmt = this.db.prepare(`
      SELECT estimated_latency as estimatedLatency FROM sync_status WHERE id = 1
    `);

    this.setEstimatedLatencyStmt = this.db.prepare(`
      UPDATE sync_status SET estimated_latency = ? WHERE id = 1
    `);
  }

  async getLastSyncAt(): Promise<number | null> {
    const row = this.getLastSyncAtStmt.get() as any;
    return row?.lastSyncAt ?? null;
  }

  async setLastSyncAt(timestamp: number): Promise<void> {
    this.setLastSyncAtStmt.run(timestamp);
  }

  async getEstimatedLatency(): Promise<number | null> {
    const row = this.getEstimatedLatencyStmt.get() as any;
    return row?.estimatedLatency ?? null;
  }

  async setEstimatedLatency(latencyMs: number): Promise<void> {
    this.setEstimatedLatencyStmt.run(latencyMs);
  }
}

/**
 * SQLite Offline Queue Repository
 */
export class SQLiteOfflineQueueRepository implements OfflineQueueRepository {
  private db: Database.Database;
  private readonly MAX_QUEUE_SIZE = 1000;

  constructor(db: Database.Database) {
    this.db = db;
    this.prepareStatements();
  }

  private getSizeStmt!: Database.Statement;
  private getPendingMessagesStmt!: Database.Statement;
  private enqueueStmt!: Database.Statement;
  private dequeueStmt!: Database.Statement;

  private prepareStatements(): void {
    this.getSizeStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM offline_queue
    `);

    this.getPendingMessagesStmt = this.db.prepare(`
      SELECT 
        message_id as messageId,
        thread_id as threadId,
        sender_alias as senderAlias,
        payload,
        state,
        created_at as createdAt,
        client_message_id as clientMessageId,
        retry_count as retryCount
      FROM offline_queue
      ORDER BY created_at ASC
    `);

    this.enqueueStmt = this.db.prepare(`
      INSERT INTO offline_queue (
        message_id, thread_id, sender_alias, payload, state, created_at, client_message_id, retry_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.dequeueStmt = this.db.prepare(`
      DELETE FROM offline_queue WHERE message_id = ?
    `);
  }

  async getSize(): Promise<number> {
    const row = this.getSizeStmt.get() as { count: number };
    return row.count;
  }

  async getPendingMessages(): Promise<InternalMessage[]> {
    const rows = this.getPendingMessagesStmt.all() as any[];

    return rows.map(row => ({
      messageId: row.messageId,
      threadId: row.threadId,
      senderAlias: row.senderAlias,
      payload: row.payload,
      state: row.state as InternalMessage['state'],
      createdAt: row.createdAt,
      clientMessageId: row.clientMessageId || undefined,
      retryCount: row.retryCount || undefined,
    }));
  }

  async enqueue(message: InternalMessage): Promise<void> {
    const size = await this.getSize();
    if (size >= this.MAX_QUEUE_SIZE) {
      throw new Error(`Offline queue is full: ${size} >= ${this.MAX_QUEUE_SIZE}`);
    }

    this.enqueueStmt.run(
      message.messageId,
      message.threadId,
      message.senderAlias,
      message.payload,
      message.state,
      message.createdAt,
      message.clientMessageId || null,
      message.retryCount || 0
    );
  }

  async dequeue(messageId: string): Promise<void> {
    this.dequeueStmt.run(messageId);
  }
}

/**
 * SQLite Rate Limit Repository
 */
export class SQLiteRateLimitRepository implements RateLimitRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.prepareStatements();
  }

  private checkLimitStmt!: Database.Statement;
  private recordRequestStmt!: Database.Statement;
  private cleanupStmt!: Database.Statement;

  private prepareStatements(): void {
    this.checkLimitStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM rate_limits
      WHERE sender_alias = ? AND timestamp > ?
    `);

    this.recordRequestStmt = this.db.prepare(`
      INSERT INTO rate_limits (sender_alias, timestamp) VALUES (?, ?)
    `);

    this.cleanupStmt = this.db.prepare(`
      DELETE FROM rate_limits WHERE timestamp < ?
    `);
  }

  async checkLimit(senderAlias: string, windowMs: number, maxRequests: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Cleanup vecchie richieste (opzionale, per performance)
    this.cleanupStmt.run(windowStart);

    const row = this.checkLimitStmt.get(senderAlias, windowStart) as { count: number };
    return row.count < maxRequests;
  }

  async recordRequest(senderAlias: string, timestamp: number): Promise<void> {
    this.recordRequestStmt.run(senderAlias, timestamp);
  }
}

/**
 * SQLite Alias Repository
 */
export class SQLiteAliasRepository implements AliasRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.prepareStatements();
  }

  private existsStmt!: Database.Statement;
  private isRootIdentityStmt!: Database.Statement;
  private addAliasStmt!: Database.Statement;

  private prepareStatements(): void {
    this.existsStmt = this.db.prepare(`
      SELECT EXISTS(SELECT 1 FROM aliases WHERE id = ?) as exists
    `);

    this.isRootIdentityStmt = this.db.prepare(`
      SELECT is_root as isRoot FROM aliases WHERE id = ?
    `);

    this.addAliasStmt = this.db.prepare(`
      INSERT OR IGNORE INTO aliases (id, is_root) VALUES (?, ?)
    `);
  }

  /**
   * Aggiunge alias (per test/setup)
   */
  addAlias(aliasId: string, isRoot: boolean = false): void {
    this.addAliasStmt.run(aliasId, isRoot ? 1 : 0);
  }

  async exists(aliasId: string): Promise<boolean> {
    const result = this.existsStmt.get(aliasId) as { exists: number };
    return result.exists === 1;
  }

  async isRootIdentity(aliasId: string): Promise<boolean> {
    const row = this.isRootIdentityStmt.get(aliasId) as any;
    if (!row) {
      return false;
    }
    return row.isRoot === 1;
  }
}
