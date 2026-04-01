/**
 * MessageEdited — evento di dominio (Blocco 6.1.1)
 * Emesso quando un messaggio viene modificato. Solo dati minimali.
 */

import type { DomainEvent, DomainEventMetadata } from './DomainEvent';

const EVENT_TYPE = 'MessageEdited';

export interface MessageEditedPayload {
  readonly messageId: string;
  readonly threadId: string;
  readonly contentLengthAfter: number;
  readonly occurredAt: number;
}

export class MessageEdited implements DomainEvent {
  readonly eventType = EVENT_TYPE;
  readonly eventId: string;
  readonly occurredAt: number;
  readonly aggregateId: string;
  readonly metadata?: DomainEventMetadata;

  constructor(payload: MessageEditedPayload & { eventId: string }) {
    this.eventId = payload.eventId;
    this.occurredAt = payload.occurredAt;
    this.aggregateId = payload.messageId;
    this.metadata = {
      threadId: payload.threadId,
      contentLengthAfter: payload.contentLengthAfter,
    };
    Object.freeze(this);
  }
}
