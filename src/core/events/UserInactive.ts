/**
 * UserInactive — evento di dominio (Blocco 6.1.1)
 * Emesso quando un utente è considerato inattivo. Solo dati minimali.
 */

import type { DomainEvent, DomainEventMetadata } from './DomainEvent';

const EVENT_TYPE = 'UserInactive';

export interface UserInactivePayload {
  readonly userId: string;
  readonly lastActiveAt: number;
  readonly occurredAt: number;
}

export class UserInactive implements DomainEvent {
  readonly eventType = EVENT_TYPE;
  readonly eventId: string;
  readonly occurredAt: number;
  readonly aggregateId: string;
  readonly metadata?: DomainEventMetadata;

  constructor(payload: UserInactivePayload & { eventId: string }) {
    this.eventId = payload.eventId;
    this.occurredAt = payload.occurredAt;
    this.aggregateId = payload.userId;
    this.metadata = {
      lastActiveAt: payload.lastActiveAt,
    };
    Object.freeze(this);
  }
}
