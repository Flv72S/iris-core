/**
 * In-Memory Event Store — append-only, retention limitata (Blocco 6.1.3)
 *
 * Memorizza eventi in ordine; retention temporale opzionale.
 * Nessuna API di lettura esposta al dominio. Per test/observability: getAllForTest().
 */

import type { DomainEvent } from './DomainEvent';
import type { DomainEventStore } from './DomainEventStore';

export interface InMemoryEventStoreOptions {
  /**
   * Retention in millisecondi. Eventi con occurredAt < (now - retentionMs) vengono rimossi.
   * 0 o undefined = nessuna retention (tutti gli eventi restano). Disattivabile.
   */
  retentionMs?: number;
}

export class InMemoryEventStore implements DomainEventStore {
  private readonly events: DomainEvent[] = [];
  private readonly retentionMs: number;

  constructor(options?: InMemoryEventStoreOptions) {
    this.retentionMs = options?.retentionMs ?? 0;
  }

  append(event: DomainEvent): void {
    try {
      this.events.push(event);
      if (this.retentionMs > 0) {
        this.prune();
      }
    } catch {
      // Perdita tollerata: non propagare al chiamante
    }
  }

  private prune(): void {
    const cutoff = Date.now() - this.retentionMs;
    while (this.events.length > 0 && this.events[0].occurredAt < cutoff) {
      this.events.shift();
    }
  }

  /**
   * Solo per test e osservabilità. Non usare dal dominio.
   */
  getAllForTest(): readonly DomainEvent[] {
    return [...this.events];
  }
}
