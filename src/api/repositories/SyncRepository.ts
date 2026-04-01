/**
 * Sync Repository Interface
 * 
 * Astrazione pura per sincronizzazione e coda offline.
 * Nessuna logica di dominio, solo operazioni primitive.
 * 
 * Vincoli:
 * - Solo interfacce + operazioni primitive
 * - Nessuna logica di dominio
 * - Nessuna inferenza, fallback o comportamento automatico
 * 
 * Riferimenti vincolanti:
 * - IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md
 * - src/api/core/syncDelivery.ts (interfacce repository)
 */

import type { InternalMessage } from '../core/types';

/**
 * Sync Repository Interface
 * 
 * Operazioni primitive per sincronizzazione:
 * - getLastSyncAt: ottiene timestamp ultima sincronizzazione
 * - setLastSyncAt: salva timestamp ultima sincronizzazione
 * - getEstimatedLatency: ottiene latenza stimata
 * - setEstimatedLatency: salva latenza stimata
 */
export interface SyncStatusRepository {
  /**
   * Ottiene timestamp ultima sincronizzazione
   * 
   * Vincoli (Invariante SYS-05):
   * - Timestamp arrotondato (se presente)
   * - Restituisce null se non disponibile
   */
  getLastSyncAt(): Promise<number | null>;

  /**
   * Salva timestamp ultima sincronizzazione
   * 
   * Vincoli (Invariante SYS-05):
   * - Timestamp arrotondato
   */
  setLastSyncAt(timestamp: number): Promise<void>;

  /**
   * Ottiene latenza stimata
   * 
   * Vincoli (Invariante SYS-08):
   * - Latenza esplicita (non inferita)
   * - Restituisce null se non disponibile
   */
  getEstimatedLatency(): Promise<number | null>;

  /**
   * Salva latenza stimata
   * 
   * Vincoli (Invariante SYS-08):
   * - Latenza esplicita (non inferita)
   */
  setEstimatedLatency(latencyMs: number): Promise<void>;
}

/**
 * Offline Queue Repository Interface
 * 
 * Operazioni primitive per coda offline:
 * - getSize: ottiene dimensione coda
 * - getPendingMessages: ottiene messaggi in coda
 * - enqueue: aggiunge messaggio in coda
 * - dequeue: rimuove messaggio da coda
 */
export interface OfflineQueueRepository {
  /**
   * Ottiene dimensione coda offline
   * 
   * Vincoli (Invariante SYS-07, SYS-10):
   * - Max 1000 messaggi
   * - Dimensione esplicita (non derivata)
   */
  getSize(): Promise<number>;

  /**
   * Ottiene messaggi in coda offline
   * 
   * Vincoli (Invariante SYS-07):
   * - Lista finita
   * - Ordinamento per createdAt ASC
   */
  getPendingMessages(): Promise<InternalMessage[]>;

  /**
   * Aggiunge messaggio in coda offline
   * 
   * Vincoli (Invariante SYS-07):
   * - Max 1000 messaggi
   * - Nessun fallback silenzioso
   */
  enqueue(message: InternalMessage): Promise<void>;

  /**
   * Rimuove messaggio da coda offline
   * 
   * Vincoli:
   * - Nessun fallback silenzioso
   */
  dequeue(messageId: string): Promise<void>;
}

/**
 * Rate Limit Repository Interface
 * 
 * Operazioni primitive per rate limiting:
 * - checkLimit: verifica limite rate
 * - recordRequest: registra richiesta
 */
export interface RateLimitRepository {
  /**
   * Verifica limite rate
   * 
   * Vincoli:
   * - Restituisce boolean esplicito
   * - Nessun fallback silenzioso
   */
  checkLimit(senderAlias: string, windowMs: number, maxRequests: number): Promise<boolean>;

  /**
   * Registra richiesta per rate limiting
   * 
   * Vincoli:
   * - Nessuna logica di aggregazione
   */
  recordRequest(senderAlias: string, timestamp: number): Promise<void>;
}

/**
 * Alias Repository Interface
 * 
 * Operazioni primitive per alias:
 * - exists: verifica esistenza alias
 * - isRootIdentity: verifica se alias è root identity
 */
export interface AliasRepository {
  /**
   * Verifica esistenza alias
   * 
   * Vincoli (Invariante SYS-03):
   * - Restituisce boolean esplicito
   * - Nessun fallback silenzioso
   */
  exists(aliasId: string): Promise<boolean>;

  /**
   * Verifica se alias è root identity
   * 
   * Vincoli (Invariante SYS-03):
   * - Root identity mai esposta
   * - Restituisce boolean esplicito
   */
  isRootIdentity(aliasId: string): Promise<boolean>;
}
