/**
 * Event Store Listener — bridge dispatcher → event store (Blocco 6.1.3)
 *
 * Implementa DomainEventListener: alla handle(event) chiama eventStore.append(event).
 * Errori da append non vengono propagati (perdita tollerata).
 */

import type { DomainEvent } from './DomainEvent';
import type { DomainEventListener } from './DomainEventListener';
import type { DomainEventStore } from './DomainEventStore';

export class EventStoreListener implements DomainEventListener {
  constructor(private readonly eventStore: DomainEventStore) {}

  handle(event: DomainEvent): void {
    try {
      this.eventStore.append(event);
    } catch {
      // Perdita tollerata: l'app continua a funzionare
    }
  }
}
