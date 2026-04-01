import type { MessageId, ThreadId } from '../../queries/read-models/ids';
import type { MessageReadModel } from '../../queries/read-models/MessageReadModel';
import type { MessageWithThreadReadModel } from '../../queries/read-models/MessageWithThreadReadModel';
import type { InMemoryCache } from './InMemoryCache';

type MessageProjectionForCache = Readonly<{
  getMessageById(id: MessageId): Promise<MessageReadModel | null>;
  findByThreadId(threadId: ThreadId): Promise<MessageReadModel[]>;
  getMessageWithThread(id: MessageId): Promise<MessageWithThreadReadModel | null>;
  projectMessageWithThread(messageId: MessageId): Promise<MessageWithThreadReadModel | null>;
}>;

function cacheKey(method: string, args: unknown[]): string {
  return `${method}:${JSON.stringify(args)}`;
}

export class CachedMessageReadProjection implements MessageProjectionForCache {
  constructor(
    private readonly inner: MessageProjectionForCache,
    private readonly cache: InMemoryCache
  ) {}

  async getMessageById(id: MessageId): Promise<MessageReadModel | null> {
    const key = cacheKey('getMessageById', [id]);
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit as MessageReadModel | null;
    const out = await this.inner.getMessageById(id);
    this.cache.set(key, out);
    return out;
  }

  async findByThreadId(threadId: ThreadId): Promise<MessageReadModel[]> {
    const key = cacheKey('findByThreadId', [threadId]);
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit as MessageReadModel[];
    const out = await this.inner.findByThreadId(threadId);
    this.cache.set(key, out);
    return out;
  }

  async getMessageWithThread(id: MessageId): Promise<MessageWithThreadReadModel | null> {
    const key = cacheKey('getMessageWithThread', [id]);
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit as MessageWithThreadReadModel | null;
    const out = await this.inner.getMessageWithThread(id);
    this.cache.set(key, out);
    return out;
  }

  async projectMessageWithThread(messageId: MessageId): Promise<MessageWithThreadReadModel | null> {
    const key = cacheKey('projectMessageWithThread', [messageId]);
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit as MessageWithThreadReadModel | null;
    const out = await this.inner.projectMessageWithThread(messageId);
    this.cache.set(key, out);
    return out;
  }
}
