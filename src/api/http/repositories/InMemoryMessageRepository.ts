/**
 * InMemoryMessageRepository (HTTP Adapter Layer)
 *
 * Scopo: implementazione in-memory di `MessageRepository` per l'HTTP adapter (Fase 2.2).
 *
 * Vincoli:
 * - Nessun accesso a DB/fs/env
 * - Nessuna logica di business (solo storage)
 * - Implementa solo il contratto Core
 */

import type { Message } from '../../../core/messages/Message';
import type { MessageRepository } from '../../../core/messages/MessageRepository';

export class InMemoryMessageRepository implements MessageRepository {
  private readonly byId = new Map<string, Message>();
  private readonly byThreadId = new Map<string, Message[]>();

  async save(message: Message): Promise<void> {
    this.byId.set(message.id, message);

    const existing = this.byThreadId.get(message.threadId) ?? [];
    this.byThreadId.set(message.threadId, [...existing, message]);
  }

  async findByThreadId(threadId: string): Promise<Message[]> {
    return this.byThreadId.get(threadId) ?? [];
  }

  async findById(id: string): Promise<Message | null> {
    return this.byId.get(id) ?? null;
  }
}

