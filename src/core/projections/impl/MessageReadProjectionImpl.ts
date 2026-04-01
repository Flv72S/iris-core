import type { MessageReadProjection } from '../MessageReadProjection';
import type { MessageId, ThreadId } from '../../queries/read-models/ids';
import type { MessageReadModel } from '../../queries/read-models/MessageReadModel';
import type { MessageWithThreadReadModel } from '../../queries/read-models/MessageWithThreadReadModel';

/**
 * MessageReadProjectionImpl (Query-backed)
 *
 * Vincoli:
 * - Adapter puro: solo delega al Query Repository
 * - Nessuna logica/mapping/trasformazione dei dati
 * - Nessun import da persistence/api/prisma/domain
 */

// Tipo strutturale (non importa Query Port dal Core): evita dipendenze fuori da read-models.
export type MessageQueryRepositoryForProjection = Readonly<{
  findById(id: MessageId): Promise<MessageReadModel | null>;
  findByThreadId(threadId: ThreadId): Promise<MessageReadModel[]>;
  findMessageWithThreadById(messageId: MessageId): Promise<MessageWithThreadReadModel | null>;
}>;

export class MessageReadProjectionImpl implements MessageReadProjection {
  constructor(private readonly queryRepo: MessageQueryRepositoryForProjection) {}

  async getMessageById(id: MessageId): Promise<MessageReadModel | null> {
    return await this.queryRepo.findById(id);
  }

  async findByThreadId(threadId: ThreadId): Promise<MessageReadModel[]> {
    return await this.queryRepo.findByThreadId(threadId);
  }

  async getMessageWithThread(id: MessageId): Promise<MessageWithThreadReadModel | null> {
    return await this.queryRepo.findMessageWithThreadById(id);
  }

  async projectMessageWithThread(messageId: MessageId): Promise<MessageWithThreadReadModel | null> {
    return await this.getMessageWithThread(messageId);
  }
}

