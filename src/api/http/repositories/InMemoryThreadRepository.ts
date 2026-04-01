/**
 * InMemoryThreadRepository (HTTP Adapter Layer)
 *
 * Scopo: implementazione in-memory di `ThreadRepository` per l'HTTP adapter (Fase 1.2).
 *
 * Vincoli:
 * - Nessun accesso a DB/fs/env
 * - Nessuna logica di business (solo storage)
 * - Implementa solo il contratto Core
 */

import type { Thread } from '../../../core/threads/Thread';
import type { ThreadRepository } from '../../../core/threads/ThreadRepository';

export class InMemoryThreadRepository implements ThreadRepository {
  private readonly store = new Map<string, Thread>();

  async save(thread: Thread): Promise<void> {
    // Upsert semantico per contratto: stesso id => update, nessun duplicato.
    this.store.set(thread.getId(), thread);
  }

  async findById(id: string): Promise<Thread | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<Thread[]> {
    return Array.from(this.store.values());
  }

  async deleteById(id: string): Promise<void> {
    // Idempotente: delete su id non esistente non deve throw.
    this.store.delete(id);
  }
}

