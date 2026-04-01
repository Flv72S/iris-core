/**
 * Wiring: invalidates message and thread read caches after each successful save.
 * Policy: only in wiring; no business logic.
 */

import type { MessageRepository } from '../../../core/messages/MessageRepository';
import type { Message } from '../../../core/messages/Message';
import type { CacheInvalidator } from '../../../core/projections/cache';
import { buildCacheKey } from '../../../core/projections/cache';

export class InvalidatingMessageRepository implements MessageRepository {
  constructor(
    private readonly inner: MessageRepository,
    private readonly messageCache: CacheInvalidator,
    private readonly threadCache: CacheInvalidator
  ) {}

  async save(message: Message): Promise<void> {
    await this.inner.save(message);
    const threadId = message.threadId;
    const messageId = message.id;
    this.messageCache.invalidateByKey(buildCacheKey('findByThreadId', [threadId]));
    this.messageCache.invalidateByKey(buildCacheKey('getMessageById', [messageId]));
    this.messageCache.invalidateByKey(buildCacheKey('getMessageWithThread', [messageId]));
    this.messageCache.invalidateByKey(buildCacheKey('projectMessageWithThread', [messageId]));
    this.threadCache.invalidateByKey(buildCacheKey('getThreadWithMessages', [threadId]));
    this.threadCache.invalidateByKey(buildCacheKey('projectThreadWithMessages', [threadId]));
  }

  findByThreadId(threadId: string): Promise<Message[]> {
    return this.inner.findByThreadId(threadId);
  }

  findById(id: string): Promise<Message | null> {
    return this.inner.findById(id);
  }
}
