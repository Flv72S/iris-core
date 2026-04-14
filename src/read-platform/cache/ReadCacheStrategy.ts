/**
 * Read Cache Strategy — PORTA (policy, non storage)
 * Decide se e come cacheare un read model. Nessuna memorizzazione, nessun I/O.
 */

import type { ReadSLA } from '../../core/read-sla/ReadSLA';

/**
 * Decisione di cache: raccomandazioni, non enforcement.
 */
export interface ReadCacheDecision {
  readonly cache: boolean;
  /** TTL suggerito (ms). */
  readonly ttlMs?: number;
  /** Revalidate dopo (ms). */
  readonly revalidateAfterMs?: number;
}

/**
 * Strategia di cache: dato SLA (e opzionali metadati), restituisce una decisione.
 * Nessuna conoscenza di projection, runner, store, dominio.
 */
export interface ReadCacheStrategy {
  decide(sla?: ReadSLA): ReadCacheDecision;
}
