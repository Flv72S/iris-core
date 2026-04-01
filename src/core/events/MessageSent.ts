/**
 * MessageSent — evento di dominio (Blocco 6.1.1)
 * Emesso quando un messaggio viene inviato. Solo dati minimali (ID, lunghezze, timestamp).
 */

import type { DomainEvent, DomainEventMetadata } from './DomainEvent';

const EVENT_TYPE = 'MessageSent';

export interface MessageSentPayload {
  readonly messageId: string;
  readonly threadId: string;
  readonly contentLength: number;
  readonly occurredAt: number;
}

export class MessageSent implements DomainEvent {
  readonly eventType = EVENT_TYPE;
  readonly eventId: string;
  readonly occurredAt: number;
  readonly aggregateId: string;
  readonly metadata?: DomainEventMetadata;

  constructor(payload: MessageSentPayload & { eventId: string }) {
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
