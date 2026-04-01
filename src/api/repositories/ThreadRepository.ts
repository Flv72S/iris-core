/**
 * Thread Repository Interface
 * 
 * Astrazione pura per persistenza thread.
 * Nessuna logica di dominio, solo operazioni primitive.
 * 
 * Vincoli:
 * - Solo interfacce + operazioni primitive
 * - Nessuna logica di dominio
 * - Nessuna inferenza, fallback o comportamento automatico
 * 
 * Riferimenti vincolanti:
 * - IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md
 * - src/api/core/threadState.ts (interfacce repository)
 */

import type { ThreadState, InternalThread } from '../core/types';

/**
 * Thread memorizzato (stored)
 * 
 * Vincoli:
 * - Identico a InternalThread (nessuna trasformazione)
 * - Solo operazioni primitive (get / set / exists)
 */
export type StoredThread = InternalThread;

/**
 * Thread Repository Interface
 * 
 * Operazioni primitive per thread:
 * - exists: verifica esistenza thread
 * - get: ottiene thread per ID
 * - set: salva/aggiorna thread
 * - updateState: aggiorna stato thread
 */
export interface ThreadRepository {
  /**
   * Verifica esistenza thread
   * 
   * Vincoli:
   * - Restituisce boolean esplicito (nessun fallback)
   */
  exists(threadId: string): Promise<boolean>;

  /**
   * Ottiene thread per ID
   * 
   * Vincoli:
   * - Restituisce null se non trovato (nessun fallback)
   */
  get(threadId: string): Promise<StoredThread | null>;

  /**
   * Salva/aggiorna thread
   * 
   * Vincoli:
   * - Nessuna logica di merge o upsert
   * - Sostituzione completa (se esiste)
   */
  set(thread: StoredThread): Promise<void>;

  /**
   * Aggiorna stato thread
   * 
   * Vincoli (Invariante SYS-04, SYS-05):
   * - Stato esplicito (enum chiuso, finito)
   * - Timestamp arrotondato
   */
  updateState(threadId: string, newState: ThreadState, transitionedAt: number): Promise<void>;

  /**
   * Ottiene stato thread
   * 
   * Vincoli (Invariante SYS-04):
   * - Restituisce null se thread non esiste
   * - Stato esplicito (enum chiuso, finito)
   */
  getState(threadId: string): Promise<ThreadState | null>;
}
