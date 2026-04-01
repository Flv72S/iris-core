import type { MessageQueryRepository } from '../../core/queries/MessageQueryRepository';
import type { MessageId, ThreadId } from '../../core/queries/read-models/ids';
import type { MessageReadModel } from '../../core/queries/read-models/MessageReadModel';
import type { MessageWithThreadReadModel } from '../../core/queries/read-models/MessageWithThreadReadModel';
import type { MessageRepository } from '../../core/messages/MessageRepository';
import type { ThreadRepository } from '../../core/threads/ThreadRepository';

/**
 * InMemoryMessageQueryRepository
 *
 * Adapter read-only che costruisce Read Models a partire dal repository di dominio.
 * Usato per garantire read-your-writes in modalità in-memory, senza toccare il Core.
 * findMessageWithThreadById richiede threadRepository (opzionale); se assente restituisce null.
 */
export class InMemoryMessageQueryRepository implements MessageQueryRepository {
  constructor(
    private readonly repository: MessageRepository,
    private readonly threadRepository?: ThreadRepository
  ) {}

  async findByThreadId(threadId: ThreadId): Promise<MessageReadModel[]> {
    const messages = await this.repository.findByThreadId(threadId);
    return messages.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      author: m.author,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async findById(id: MessageId): Promise<MessageReadModel | null> {
    const m = await this.repository.findById(id);
    if (!m) return null;
    return this.messageToReadModel(m);
  }

  /**
   * Restituisce Message + Thread in un unico Read Model denormalizzato.
   * Un solo accesso logico (message + thread); nessuna composizione lato HTTP.
   */
  async findMessageWithThreadById(messageId: MessageId): Promise<MessageWithThreadReadModel | null> {
    const m = await this.repository.findById(messageId);
    if (!m) return null;
    if (!this.threadRepository) return null;
    const t = await this.threadRepository.findById(m.threadId);
    if (!t) return null;
    return {
      id: m.id,
      content: m.content,
      author: m.author,
      createdAt: m.createdAt.toISOString(),
      thread: {
        id: t.getId(),
        title: t.getTitle(),
        archived: t.isArchived(),
      },
    };
  }

  private messageToReadModel(m: { id: string; threadId: string; author: string; content: string; createdAt: Date }): MessageReadModel {
    return {
      id: m.id,
      threadId: m.threadId,
      author: m.author,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    };
  }
}

