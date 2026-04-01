/**
 * CreateThread (Core Use Case)
 *
 * Vincoli:
 * - Core-only (no HTTP/DB/env/adapter)
 * - Usa solo: Thread + ThreadRepository
 * - Propaga errori di invarianti (non catch)
 * - Nessun accesso a campi interni della Thread (solo API pubblica)
 * - Eventi dominio (6.1.1): emissione opzionale, senza side-effect
 */

import { Thread } from '../Thread';
import type { ThreadRepository } from '../ThreadRepository';
import type { DomainEventCollector } from '../../events/EventCollector';
import { ThreadCreated } from '../../events';

function eventId(): string {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.floor(Math.random() * 16);
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
}

export class CreateThread {
  constructor(
    private readonly repo: ThreadRepository,
    private readonly eventCollector?: DomainEventCollector
  ) {}

  async execute(input: { title: string }): Promise<Thread> {
    const thread = Thread.create({ title: input.title });

    await this.repo.save(thread);

    if (this.eventCollector) {
      this.eventCollector.emit(
        new ThreadCreated({
          eventId: eventId(),
          threadId: thread.getId(),
          titleLength: thread.getTitle().length,
          occurredAt: Date.now(),
        })
      );
    }

    return thread;
  }
}

