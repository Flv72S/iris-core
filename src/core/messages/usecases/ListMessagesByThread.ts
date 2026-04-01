/**
 * ListMessagesByThread (Core Use Case)
 *
 * Vincoli:
 * - Core-only (no HTTP/DB/env/adapter)
 * - Nessuna logica applicativa: delega pura al repository
 * - Ordine = quello fornito dal repository
 * - Propaga errori (no try/catch)
 */

import type { Message } from '../Message';
import type { MessageRepository } from '../MessageRepository';
import type { ThreadId } from '../ids';

export class ListMessagesByThread {
  constructor(private readonly repository: MessageRepository) {}

  async execute(threadId: ThreadId): Promise<Message[]> {
    return await this.repository.findByThreadId(threadId);
  }
}

