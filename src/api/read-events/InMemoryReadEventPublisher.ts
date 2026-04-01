/**
 * In-Memory Read Event Publisher — ADAPTER (write-side)
 * Per sviluppo e test: salva gli eventi in memoria.
 * Nessuna dipendenza da framework; nessuna conoscenza di read store o projection.
 * Non lancia mai eccezioni verso il chiamante.
 */

import type { ReadEvent, ReadEventPublisher } from './ReadEventPublisher';

export class InMemoryReadEventPublisher implements ReadEventPublisher {
  private readonly events: ReadEvent[] = [];

  async publish(event: ReadEvent): Promise<void> {
    try {
      this.events.push(event);
    } catch {
      // Assorbe eventuali errori; non bloccare il write path
    }
  }

  /** Solo per test: restituisce gli eventi pubblicati (copia). */
  getPublishedEvents(): readonly ReadEvent[] {
    return [...this.events];
  }
}
