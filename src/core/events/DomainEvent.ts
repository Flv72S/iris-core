/**
 * Domain Event — astrazione base (Blocco 6.1.1)
 *
 * Eventi append-only, shadow, passivi. Descrivono ciò che è successo.
 * Nessuna logica; solo dati serializzabili.
 */

export type DomainEventMetadata = Readonly<Record<string, string | number | boolean>>;

export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: number;
  readonly aggregateId: string;
  readonly metadata?: DomainEventMetadata;
}
