/**
 * ListThreads (Core Use Case)
 *
 * Vincoli:
 * - Core-only (no HTTP/DB/env/adapter)
 * - Usa solo: ThreadRepository (Thread come tipo di ritorno)
 * - Nessun sorting/paging/filtri/trasformazioni
 * - Propaga errori (non catch)
 */

import type { Thread } from '../Thread';
import type { ThreadRepository } from '../ThreadRepository';

export class ListThreads {
  constructor(private readonly repo: ThreadRepository) {}

  async execute(): Promise<Thread[]> {
    // NOTE: contratto repository: findAll() ritorna sempre un array (anche vuoto).
    return await this.repo.findAll();
  }
}

