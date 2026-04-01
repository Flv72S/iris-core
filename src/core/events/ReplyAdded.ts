/**
 * ReplyAdded — evento di dominio (Blocco 6.1.1)
 * Emesso quando una risposta viene aggiunta a un thread. Solo dati minimali.
 */

import type { DomainEvent, DomainEventMetadata } from './DomainEvent';

const EVENT_TYPE = 'ReplyAdded';

export interface ReplyAddedPayload {
  readonly messageId: string;
  readonly threadId: string;
  readonly contentLength: number;
  readonly occurredAt: number;
}

export class ReplyAdded implements DomainEvent {
  readonly eventType = EVENT_TYPE;
  readonly eventId: string;
  readonly occurredAt: number;
  readonly aggregateId: string;
  readonly metadata?: DomainEventMetadata;

  constructor(payload: ReplyAddedPayload & { eventId: string }) {
    this.eventId = payload.eventId;
    this.occurredAt = payload.occurredAt;
    this.aggregateId = payload.messageId;
    this.metadata = {
      threadId: payload.threadId,
      contentLength: payload.contentLength,
    };
    Object.freeze(this);
  }
}
