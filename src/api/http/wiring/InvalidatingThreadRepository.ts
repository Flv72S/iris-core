/**
 * Wiring: invalidates thread read cache after each successful save.
 * Policy: only in wiring; no business logic.
 */

import type { ThreadRepository } from '../../../core/threads/ThreadRepository';
import type { Thread } from '../../../core/threads/Thread';
import type { CacheInvalidator } from '../../../core/projections/cache';
import { buildCacheKey } from '../../../core/projections/cache';

export class InvalidatingThreadRepository implements ThreadRepository {
  constructor(
    private readonly inner: ThreadRepository,
    private readonly threadCache: CacheInvalidator
  ) {}

  async save(thread: Thread): Promise<void> {
    await this.inner.save(thread);
    const id = thread.getId();
    this.threadCache.invalidateByKey(buildCacheKey('findAll', []));
    this.threadCache.invalidateByKey(buildCacheKey('getThreadById', [id]));
    this.threadCache.invalidateByKey(buildCacheKey('getThreadWithMessages', [id]));
    this.threadCache.invalidateByKey(buildCacheKey('projectThreadWithMessages', [id]));
  }

  findById(id: string): Promise<Thread | null> {
    return this.inner.findById(id);
  }

  findAll(): Promise<Thread[]> {
    return this.inner.findAll();
  }

  deleteById(id: string): Promise<void> {
    return this.inner.deleteById(id);
  }
}
