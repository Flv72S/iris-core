import type { ThreadId } from '../../queries/read-models/ids';
import type { ThreadReadModel } from '../../queries/read-models/ThreadReadModel';
import type { ThreadWithMessagesReadModel } from '../../queries/read-models/ThreadWithMessagesReadModel';
import type { InMemoryCache } from './InMemoryCache';

type ThreadProjectionForCache = Readonly<{
  findAll(): Promise<ThreadReadModel[]>;
  getThreadById(id: ThreadId): Promise<ThreadReadModel | null>;
  getThreadWithMessages(id: ThreadId): Promise<ThreadWithMessagesReadModel | null>;
  projectThreadWithMessages(threadId: ThreadId): Promise<ThreadWithMessagesReadModel | null>;
}>;

function cacheKey(method: string, args: unknown[]): string {
  return `${method}:${JSON.stringify(args)}`;
}

export class CachedThreadReadProjection implements ThreadProjectionForCache {
  constructor(
    private readonly inner: ThreadProjectionForCache,
    private readonly cache: InMemoryCache
  ) {}

  async findAll(): Promise<ThreadReadModel[]> {
    const key = cacheKey('findAll', []);
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit as ThreadReadModel[];
    const out = await this.inner.findAll();
    this.cache.set(key, out);
    return out;
  }

  async getThreadById(id: ThreadId): Promise<ThreadReadModel | null> {
    const key = cacheKey('getThreadById', [id]);
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit as ThreadReadModel | null;
    const out = await this.inner.getThreadById(id);
    this.cache.set(key, out);
    return out;
  }

  async getThreadWithMessages(id: ThreadId): Promise<ThreadWithMessagesReadModel | null> {
    const key = cacheKey('getThreadWithMessages', [id]);
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit as ThreadWithMessagesReadModel | null;
    const out = await this.inner.getThreadWithMessages(id);
    this.cache.set(key, out);
    return out;
  }

  async projectThreadWithMessages(threadId: ThreadId): Promise<ThreadWithMessagesReadModel | null> {
    const key = cacheKey('projectThreadWithMessages', [threadId]);
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit as ThreadWithMessagesReadModel | null;
    const out = await this.inner.projectThreadWithMessages(threadId);
    this.cache.set(key, out);
    return out;
  }
}
