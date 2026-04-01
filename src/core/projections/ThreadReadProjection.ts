import type { ThreadId } from '../queries/read-models/ids';
import type { ThreadWithMessagesReadModel } from '../queries/read-models/ThreadWithMessagesReadModel';

/**
 * ThreadReadProjection (Read-Side Policy Layer)
 *
 * Vincoli:
 * - Read-only
 * - Espone solo Read Models
 * - Nessuna conoscenza di persistence/HTTP/ORM
 * - Nessun metodo extra
 */
export interface ThreadReadProjection {
  projectThreadWithMessages(threadId: ThreadId): Promise<ThreadWithMessagesReadModel | null>;
}

