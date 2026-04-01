import type { MessageId } from '../queries/read-models/ids';
import type { MessageWithThreadReadModel } from '../queries/read-models/MessageWithThreadReadModel';

/**
 * MessageReadProjection (Read-Side Policy Layer)
 *
 * Vincoli:
 * - Read-only
 * - Espone solo Read Models
 * - Nessuna conoscenza di persistence/HTTP/ORM
 * - Nessun metodo extra
 */
export interface MessageReadProjection {
  projectMessageWithThread(messageId: MessageId): Promise<MessageWithThreadReadModel | null>;
}

