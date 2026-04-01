/**
 * In-Memory Read Store — implementazione della porta
 * Per test, sviluppo e replay locale. Nessun side-effect esterno.
 */

import type { ReadStore, WithId } from './ReadStore';

export class InMemoryReadStore<T extends WithId> implements ReadStore<T> {
  private readonly store = new Map<string, T>();

  async upsert(model: T): Promise<void> {
    this.store.set(model.id, model);
  }

  async getById(id: string): Promise<T | undefined> {
    return this.store.get(id);
  }

  async deleteById(id: string): Promise<void> {
    this.store.delete(id);
  }
}
