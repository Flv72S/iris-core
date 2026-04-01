/**
 * ThreadArchived — evento di dominio (Blocco 6.1.1)
 * Emesso quando un thread viene archiviato. Solo dati minimali.
 */

import type { DomainEvent } from './DomainEvent';

const EVENT_TYPE = 'ThreadArchived';

export interface ThreadArchivedPayload {
  readonly threadId: string;
  readonly occurredAt: number;
}

export class ThreadArchived implements DomainEvent {
  readonly eventType = EVENT_TYPE;
  readonly eventId: string;
  readonly occurredAt: number;
  readonly aggregateId: string;

  constructor(payload: ThreadArchivedPayload & { eventId: string }) {
    this.eventId = payload.eventId;
    this.occurredAt = payload.occurredAt;
    this.aggregateId = payload.threadId;
    Object.freeze(this);
  }
}
