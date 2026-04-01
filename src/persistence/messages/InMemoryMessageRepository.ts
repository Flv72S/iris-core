/**
 * InMemoryMessageRepository (Persistence Adapter Layer)
 *
 * Vincoli:
 * - Implementa ESATTAMENTE `MessageRepository` (Core)
 * - Nessuna dipendenza da DB/fs/env/http
 * - Nessuna logica di business (solo storage)
 * - Ordine preservato (inserimento)
 */

import type { Message } from '../../core/messages/Message';
import type { MessageRepository } from '../../core/messages/MessageRepository';
import type { MessageId, ThreadId } from '../../core/messages/ids';

export class InMemoryMessageRepository implements MessageRepository {
  private readonly byId = new Map<MessageId, Message>();
  private readonly byThreadId = new Map<ThreadId, Message[]>();

  async save(message: Message): Promise<void> {
    // Append-only: non modifica messaggi esistenti.
    // Se un id è già presente, non duplichiamo né sovrascriviamo.
    if (this.byId.has(message.id)) return;

    this.byId.set(message.id, message);

    const existing = this.byThreadId.get(message.threadId) ?? [];
    this.byThreadId.set(message.threadId, [...existing, message]);
  }

  async findByThreadId(threadId: ThreadId): Promise<Message[]> {
    const existing = this.byThreadId.get(threadId) ?? [];
    return [...existing];
  }

  async findById(id: MessageId): Promise<Message | null> {
    return this.byId.get(id) ?? null;
  }
}

