/**
 * No-Op Event Store — disattivazione totale (Blocco 6.1.3)
 *
 * Nessun evento salvato, nessun effetto collaterale.
 * Sostituibile senza cambiare il dominio.
 */

import type { DomainEvent } from './DomainEvent';
import type { DomainEventStore } from './DomainEventStore';

export class NoOpEventStore implements DomainEventStore {
  append(_event: DomainEvent): void {
    // intenzionalmente vuoto
  }
}
