/**
 * ThreadRepository (Core) — Persistence Contract (No Implementations)
 *
 * Dominio puro: nessuna dipendenza da HTTP, persistence concreta, env, adapter o framework.
 *
 * STEP 7 / Fase 1 / Microstep 1.1.2 — Thread Repository Interface (Core)
 *
 * NOTE (vincolante): questo file definisce SOLO il contratto. Vietate implementazioni concrete.
 */

import type { Thread } from './Thread';

/**
 * Contratto formale per la persistenza di `Thread`.
 *
 * Regole semantiche (documentate, NON implementate qui):
 * 1) save(thread): "create or update" (upsert semantico).
 *    - Salvare due volte lo stesso `id` NON deve creare duplicati.
 * 2) findById(id):
 *    - Ritorna `null` se non trovato (mai `undefined`).
 * 3) findAll():
 *    - Ritorna SEMPRE un array (anche vuoto).
 * 4) deleteById(id):
 *    - Idempotente (nessun errore se l’entity non esiste).
 */
export interface ThreadRepository {
  save(thread: Thread): Promise<void>;

  findById(id: string): Promise<Thread | null>;

  findAll(): Promise<Thread[]>;

  deleteById(id: string): Promise<void>;
}

