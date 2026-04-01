/**
 * Domain Event Listener — astrazione osservativa (Blocco 6.1.2)
 *
 * Riceve eventi; può solo osservare / loggare / annotare.
 * Non restituisce valori. Non decide nulla.
 */

import type { DomainEvent } from './DomainEvent';

export interface DomainEventListener {
  handle(event: DomainEvent): void;
}
