/**
 * In-Memory Thread Repository Implementation
 * 
 * Implementazione deterministica in-memory per test e sviluppo.
 * 
 * Vincoli:
 * - Dati finiti
 * - Nessun random
 * - Nessun clock implicito
 * - Stato esplicito resettabile
 * 
 * Riferimenti vincolanti:
 * - src/api/repositories/ThreadRepository.ts
 */

import type {
  ThreadRepository,
  StoredThread,
} from '../ThreadRepository';
import type { ThreadState } from '../../core/types';

/**
 * In-Memory Thread Repository
 * 
 * Implementazione deterministica:
 * - Storage in-memory (Map)
 * - Nessun side-effect nascosto
 */
export class InMemoryThreadRepository implements ThreadRepository {
  private threads: Map<string, StoredThread> = new Map();

  /**
   * Reset stato repository (per test)
   */
  reset(): void {
    this.threads.clear();
  }

  async exists(threadId: string): Promise<boolean> {
    return this.threads.has(threadId);
  }

  async get(threadId: string): Promise<StoredThread | null> {
    return this.threads.get(threadId) || null;
  }

  async set(thread: StoredThread): Promise<void> {
    this.threads.set(thread.threadId, thread);
  }

  async updateState(threadId: string, newState: ThreadState, transitionedAt: number): Promise<void> {
    const thread = await this.get(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    // Aggiorna thread (crea nuovo oggetto, immutabile)
    const updatedThread: StoredThread = {
      ...thread,
      state: newState,
      lastStateChangeAt: transitionedAt,
    };

    this.threads.set(threadId, updatedThread);
  }

  async getState(threadId: string): Promise<ThreadState | null> {
    const thread = await this.get(threadId);
    return thread ? thread.state : null;
  }
}
