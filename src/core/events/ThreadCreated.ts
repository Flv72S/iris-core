/**
 * ThreadCreated — evento di dominio (Blocco 6.1.1)
 * Emesso quando un thread viene creato. Solo dati minimali.
 */

import type { DomainEvent, DomainEventMetadata } from './DomainEvent';

const EVENT_TYPE = 'ThreadCreated';

export interface ThreadCreatedPayload {
  readonly threadId: string;
  readonly titleLength: number;
  readonly occurredAt: number;
}

export class ThreadCreated implements DomainEvent {
  readonly eventType = EVENT_TYPE;
  readonly eventId: string;
  readonly occurredAt: number;
  readonly aggregateId: string;
  readonly metadata?: DomainEventMetadata;

  constructor(payload: ThreadCreatedPayload & { eventId: string }) {
    this.eventId = payload.eventId;
    this.occurredAt = payload.occurredAt;
    this.aggregateId = payload.threadId;
    this.metadata = {
      titleLength: payload.titleLength,
    };
    Object.freeze(this);
  }
}
