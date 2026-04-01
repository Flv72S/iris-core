/**
 * CreateMessage (Core Use Case)
 *
 * Vincoli:
 * - Core-only (no HTTP/DB/env/adapter)
 * - Usa solo: Message + MessageRepository
 * - Append-only: crea e salva un nuovo Message
 * - Propaga errori (no try/catch)
 * - Eventi dominio (6.1.1): emissione opzionale, senza side-effect
 */

import { Message } from '../Message';
import type { MessageRepository } from '../MessageRepository';
import type { ThreadId } from '../ids';
import type { DomainEventCollector } from '../../events/EventCollector';
import { MessageSent, ReplyAdded } from '../../events';

function assertNonBlank(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`CreateMessage.${field} must be non-empty`);
  }
}

function fallbackUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateMessageId(): string {
  const id =
    typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : fallbackUuidV4();
  assertNonBlank(id, 'id');
  return id;
}

function eventId(): string {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.floor(Math.random() * 16);
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
}

export class CreateMessage {
  constructor(
    private readonly repository: MessageRepository,
    private readonly eventCollector?: DomainEventCollector
  ) {}

  async execute(input: { threadId: ThreadId; author: string; content: string }): Promise<Message> {
    assertNonBlank(input.threadId, 'threadId');
    assertNonBlank(input.author, 'author');

    const message = new Message({
      id: generateMessageId(),
      threadId: input.threadId,
      author: input.author,
      content: input.content,
      createdAt: new Date(),
    });

    await this.repository.save(message);

    if (this.eventCollector) {
      const now = Date.now();
      this.eventCollector.emit(
        new MessageSent({
          eventId: eventId(),
          messageId: message.id,
          threadId: message.threadId,
          contentLength: message.content.length,
          occurredAt: now,
        })
      );
      this.eventCollector.emit(
        new ReplyAdded({
          eventId: eventId(),
          messageId: message.id,
          threadId: message.threadId,
          contentLength: message.content.length,
          occurredAt: now,
        })
      );
    }

    return message;
  }
}

