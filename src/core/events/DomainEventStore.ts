/**
 * Domain Event Store — interfaccia append-only (Blocco 6.1.3)
 *
 * Persistenza shadow: solo append. Nessun update, delete, find, query, replay.
 * Il dominio non legge mai dall'Event Store.
 */

import type { DomainEvent } from './DomainEvent';

export interface DomainEventStore {
  append(event: DomainEvent): void;
}
