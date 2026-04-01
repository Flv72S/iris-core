import type { MessageId, ThreadId } from './read-models/ids';
import type { MessageReadModel } from './read-models/MessageReadModel';

/**
 * MessageQueryRepository (Query Port)
 *
 * Vincoli:
 * - Read-only
 * - Ritorna DTO (ReadModel), non entità di dominio
 * - Nessuna implementazione concreta in Core
 */
export interface MessageQueryRepository {
  findByThreadId(threadId: ThreadId): Promise<MessageReadModel[]>;
  findById(id: MessageId): Promise<MessageReadModel | null>;
}

