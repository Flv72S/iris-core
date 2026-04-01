/**
 * Event Collector — emissione neutra (Blocco 6.1.1)
 *
 * Riceve eventi in modo sincrono, senza side-effect obbligatori.
 * Disattivabile/rimovibile senza effetti sul flusso principale.
 */

import type { DomainEvent } from './DomainEvent';

export interface DomainEventCollector {
  emit(event: DomainEvent): void;
}

/** Collector no-op: ignora ogni evento. Usato quando l'emissione è disabilitata. */
export class NoOpEventCollector implements DomainEventCollector {
  emit(_event: DomainEvent): void {
    // intenzionalmente vuoto
  }
}
