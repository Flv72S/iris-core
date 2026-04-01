/**
 * SQLite Message Repository Implementation
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
 * - src/api/repositories/MessageRepository.ts
 * - IRIS_STEP5.7_Persistence_Map.md
 */

import type {
  MessageRepository,
  StoredMessage,
} from '../MessageRepository';
import type Database from 'better-sqlite3';

/**
 * SQLite Message Repository
 * 
 * Implementazione deterministica:
 * - SQL esplicito
 * - Nessun ORM
 * - Nessuna trasformazione semantica
 */
export class SQLiteMessageRepository implements MessageRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.prepareStatements();
  }

  private appendStmt!: Database.Statement;
  private getStmt!: Database.Statement;
  private listByThreadStmt!: Database.Statement;
  private findByClientMessageIdStmt!: Database.Statement;
  private updateDeliveryStateStmt!: Database.Statement;
  private updateRetryCountStmt!: Database.Statement;
  private insertDeliveryStatusStmt!: Database.Statement;
  private updateDeliveryStatusStmt!: Database.Statement;

  /**
   * Prepara statement SQL (performance)
   */
  private prepareStatements(): void {
    // INSERT message
    this.appendStmt = this.db.prepare(`
      INSERT INTO messages (
        id, thread_id, sender_alias, payload, state, created_at, client_message_id, retry_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // SELECT message by id and thread_id
    this.getStmt = this.db.prepare(`
      SELECT 
        id as messageId,
        thread_id as threadId,
        sender_alias as senderAlias,
        payload,
        state,
        created_at as createdAt,
        client_message_id as clientMessageId,
        retry_count as retryCount
      FROM messages
      WHERE id = ? AND thread_id = ?
    `);

    // SELECT messages by thread_id (ordered by created_at ASC)
    this.listByThreadStmt = this.db.prepare(`
      SELECT 
        id as messageId,
        thread_id as threadId,
        sender_alias as senderAlias,
        payload,
        state,
        created_at as createdAt,
        client_message_id as clientMessageId,
        retry_count as retryCount
      FROM messages
      WHERE thread_id = ?
      ORDER BY created_at ASC
      LIMIT ? OFFSET ?
    `);

    // SELECT message by client_message_id
    this.findByClientMessageIdStmt = this.db.prepare(`
      SELECT 
        id as messageId,
        thread_id as threadId,
        sender_alias as senderAlias,
        payload,
        state,
        created_at as createdAt,
        client_message_id as clientMessageId,
        retry_count as retryCount
      FROM messages
      WHERE client_message_id = ?
    `);

    // UPDATE message delivery state
    this.updateDeliveryStateStmt = this.db.prepare(`
      UPDATE messages
      SET state = ?
      WHERE id = ? AND thread_id = ?
    `);

    // UPDATE message retry count
    this.updateRetryCountStmt = this.db.prepare(`
      UPDATE messages
      SET retry_count = ?
      WHERE id = ? AND thread_id = ?
    `);

    // INSERT delivery_status
    this.insertDeliveryStatusStmt = this.db.prepare(`
      INSERT INTO delivery_status (
        message_id, thread_id, state, sent_at, delivered_at, read_at, failed_at, failure_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // UPDATE delivery_status
    this.updateDeliveryStatusStmt = this.db.prepare(`
      UPDATE delivery_status
      SET state = ?, delivered_at = ?, read_at = ?, failed_at = ?, failure_reason = ?
      WHERE message_id = ?
    `);
  }

  async append(message: StoredMessage): Promise<void> {
    try {
      // Verifica che messageId non esista già (append-only, invariante SYS-01)
      const existing = this.getStmt.get(message.messageId, message.threadId);
      if (existing) {
        throw new Error(`Message ${message.messageId} already exists (SYS-01: Append-Only)`);
      }

      // Inserisce messaggio
      this.appendStmt.run(
        message.messageId,
        message.threadId,
        message.senderAlias,
        message.payload,
        message.state,
        message.createdAt,
        message.clientMessageId || null,
        message.retryCount || 0
      );

      // Inserisce delivery_status iniziale (se state è SENT)
      if (message.state === 'SENT') {
        try {
          this.insertDeliveryStatusStmt.run(
            message.messageId,
            message.threadId,
            'SENT',
            message.createdAt,
            null,
            null,
            null,
            null
          );
        } catch (err) {
          // Ignora se già esiste (idempotenza)
        }
      }
    } catch (err: any) {
      // Verifica constraint UNIQUE su client_message_id
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' && err.message.includes('client_message_id')) {
        throw new Error(`Client message ID ${message.clientMessageId} already exists`);
      }
      throw err;
    }
  }

  async get(messageId: string, threadId: string): Promise<StoredMessage | null> {
    const row = this.getStmt.get(messageId, threadId) as any;
    if (!row) {
      return null;
    }

    return {
      messageId: row.messageId,
      threadId: row.threadId,
      senderAlias: row.senderAlias,
      payload: row.payload,
      state: row.state as StoredMessage['state'],
      createdAt: row.createdAt,
      clientMessageId: row.clientMessageId || undefined,
      retryCount: row.retryCount || undefined,
    };
  }

  async listByThread(threadId: string, limit?: number, offset?: number): Promise<StoredMessage[]> {
    const limitValue = limit ?? 1000; // Default ragionevole
    const offsetValue = offset ?? 0;

    const rows = this.listByThreadStmt.all(threadId, limitValue, offsetValue) as any[];

    return rows.map(row => ({
      messageId: row.messageId,
      threadId: row.threadId,
      senderAlias: row.senderAlias,
      payload: row.payload,
      state: row.state as StoredMessage['state'],
      createdAt: row.createdAt,
      clientMessageId: row.clientMessageId || undefined,
      retryCount: row.retryCount || undefined,
    }));
  }

  async findByClientMessageId(clientMessageId: string): Promise<StoredMessage | null> {
    const row = this.findByClientMessageIdStmt.get(clientMessageId) as any;
    if (!row) {
      return null;
    }

    return {
      messageId: row.messageId,
      threadId: row.threadId,
      senderAlias: row.senderAlias,
      payload: row.payload,
      state: row.state as StoredMessage['state'],
      createdAt: row.createdAt,
      clientMessageId: row.clientMessageId || undefined,
      retryCount: row.retryCount || undefined,
    };
  }

  async updateDeliveryState(
    messageId: string,
    threadId: string,
    state: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
    timestamp: number,
    failureReason?: string
  ): Promise<void> {
    // Aggiorna stato messaggio
    const result = this.updateDeliveryStateStmt.run(state, messageId, threadId);
    if (result.changes === 0) {
      throw new Error(`Message ${messageId} not found`);
    }

    // Aggiorna delivery_status
    const deliveredAt = state === 'DELIVERED' ? timestamp : null;
    const readAt = state === 'READ' ? timestamp : null;
    const failedAt = state === 'FAILED' ? timestamp : null;

    // Verifica se delivery_status esiste
    const existingStatus = this.db.prepare(`
      SELECT message_id FROM delivery_status WHERE message_id = ?
    `).get(messageId);

    if (existingStatus) {
      // Update
      this.updateDeliveryStatusStmt.run(
        state,
        deliveredAt,
        readAt,
        failedAt,
        failureReason || null,
        messageId
      );
    } else {
      // Insert
      this.insertDeliveryStatusStmt.run(
        messageId,
        threadId,
        state,
        timestamp, // sent_at
        deliveredAt,
        readAt,
        failedAt,
        failureReason || null
      );
    }
  }

  async updateRetryCount(messageId: string, threadId: string, retryCount: number): Promise<void> {
    const result = this.updateRetryCountStmt.run(retryCount, messageId, threadId);
    if (result.changes === 0) {
      throw new Error(`Message ${messageId} not found`);
    }
  }
}
