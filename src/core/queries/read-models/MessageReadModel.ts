import type { MessageId, ThreadId } from './ids';

/**
 * MessageReadModel (Query DTO)
 *
 * Vincoli:
 * - Solo campi primitivi / serializzabili
 * - Nessun metodo / logica
 * - Read-only
 */
export type MessageReadModel = Readonly<{
  id: MessageId;
  threadId: ThreadId;
  author: string;
  content: string;
  createdAt: string; // ISO-8601
}>;

