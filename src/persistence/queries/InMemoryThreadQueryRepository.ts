import type { ThreadQueryRepository } from '../../core/queries/ThreadQueryRepository';
import type { ThreadId } from '../../core/queries/read-models/ids';
import type { ThreadReadModel } from '../../core/queries/read-models/ThreadReadModel';
import type { ThreadWithMessagesReadModel } from '../../core/queries/read-models/ThreadWithMessagesReadModel';
import type { MessageRepository } from '../../core/messages/MessageRepository';
import type { ThreadRepository } from '../../core/threads/ThreadRepository';

/**
 * InMemoryThreadQueryRepository
 *
 * Adapter read-only che costruisce Read Models a partire dal repository di dominio.
 * Usato per garantire read-your-writes in modalità in-memory, senza toccare il Core.
 * findThreadWithMessagesById richiede messageRepository (opzionale); se assente restituisce messages: [].
 */
export class InMemoryThreadQueryRepository implements ThreadQueryRepository {
  constructor(
    private readonly repository: ThreadRepository,
    private readonly messageRepository?: MessageRepository
  ) {}

  async findAll(): Promise<ThreadReadModel[]> {
    const threads = await this.repository.findAll();
    return threads.map((t) => ({
      id: t.getId(),
      title: t.getTitle(),
      archived: t.isArchived(),
      createdAt: t.getCreatedAt().toISOString(),
      updatedAt: t.getUpdatedAt().toISOString(),
    }));
  }

  async findById(id: ThreadId): Promise<ThreadReadModel | null> {
    const t = await this.repository.findById(id);
    if (!t) return null;
    return this.threadToReadModel(t);
  }

  /**
   * Restituisce Thread + Messages in un unico Read Model denormalizzato.
   * Un solo accesso logico (thread + messages); nessuna composizione lato HTTP.
   */
  async findThreadWithMessagesById(threadId: ThreadId): Promise<ThreadWithMessagesReadModel | null> {
    const t = await this.repository.findById(threadId);
    if (!t) return null;
    const base = this.threadToReadModel(t);
    if (!this.messageRepository) {
      return { ...base, messages: [] };
    }
    const messages = await this.messageRepository.findByThreadId(threadId);
    return {
      ...base,
      messages: messages.map((m) => ({
        id: m.id,
        author: m.author,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  private threadToReadModel(t: { getId(): string; getTitle(): string; isArchived(): boolean; getCreatedAt(): Date; getUpdatedAt(): Date }): ThreadReadModel {
    return {
      id: t.getId(),
      title: t.getTitle(),
      archived: t.isArchived(),
      createdAt: t.getCreatedAt().toISOString(),
      updatedAt: t.getUpdatedAt().toISOString(),
    };
  }
}

