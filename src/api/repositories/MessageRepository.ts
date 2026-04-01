/**
 * Message Repository Interface
 * 
 * Astrazione pura per persistenza messaggi.
 * Nessuna logica di dominio, solo operazioni primitive.
 * 
 * Vincoli:
 * - Solo interfacce + operazioni primitive
 * - Nessuna logica di dominio
 * - Nessuna inferenza, fallback o comportamento automatico
 * 
 * Riferimenti vincolanti:
 * - IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md
 * - src/api/core/messageAppend.ts (interfacce repository)
 */

import type { InternalMessage } from '../core/types';

/**
 * Messaggio memorizzato (stored)
 * 
 * Vincoli:
 * - Identico a InternalMessage (nessuna trasformazione)
 * - Solo operazioni primitive (get / append / list)
 */
export type StoredMessage = InternalMessage;

/**
 * Message Repository Interface
 * 
 * Operazioni primitive per messaggi:
 * - append: aggiunge messaggio (append-only)
 * - get: ottiene messaggio per ID
 * - listByThread: lista messaggi per thread
 * - findByClientMessageId: trova messaggio per clientMessageId (idempotenza)
 */
export interface MessageRepository {
  /**
   * Aggiunge messaggio (append-only, invariante SYS-01)
   * 
   * Vincoli:
   * - Nessun overwrite
   * - Nessuna modifica retroattiva
   */
  append(message: StoredMessage): Promise<void>;

  /**
   * Ottiene messaggio per ID
   * 
   * Vincoli:
   * - Restituisce null se non trovato (nessun fallback)
   */
  get(messageId: string, threadId: string): Promise<StoredMessage | null>;

  /**
   * Lista messaggi per thread (ordinati per createdAt ASC)
   * 
   * Vincoli (Invariante SYS-02, SYS-10):
   * - threadId obbligatorio (Thread-First)
   * - Ordinamento solo per createdAt (Ordine Dichiarato)
   * - Lista finita (Finitudine Esplicita)
   */
  listByThread(threadId: string, limit?: number, offset?: number): Promise<StoredMessage[]>;

  /**
   * Trova messaggio per clientMessageId (idempotenza offline)
   * 
   * Vincoli (Invariante SYS-01):
   * - Nessun overwrite
   * - Restituisce messaggio esistente se duplicato
   */
  findByClientMessageId(clientMessageId: string): Promise<StoredMessage | null>;

  /**
   * Aggiorna stato delivery messaggio
   * 
   * Vincoli (Invariante SYS-04, SYS-05):
   * - Stato esplicito (non inferito)
   * - Timestamp arrotondato
   */
  updateDeliveryState(
    messageId: string,
    threadId: string,
    state: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
    timestamp: number,
    failureReason?: string
  ): Promise<void>;

  /**
   * Aggiorna retry count messaggio
   * 
   * Vincoli:
   * - Retry count esplicito (max 5)
   */
  updateRetryCount(messageId: string, threadId: string, retryCount: number): Promise<void>;
}
