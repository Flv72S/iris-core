/**
 * Read Freshness — CONTRATTI (valutazione, non enforcement)
 * Definisce status e risultato della valutazione di freshness. Nessuna logica.
 */

/**
 * Status di freshness del dato read-side.
 */
export type ReadFreshnessStatus = 'fresh' | 'stale' | 'unknown';

/**
 * Risultato della valutazione di freshness.
 */
export interface ReadFreshnessResult {
  readonly status: ReadFreshnessStatus;
  /** Età del dato in ms (se disponibile). */
  readonly ageMs?: number;
  /** Max staleness dalla SLA (se disponibile). */
  readonly maxStalenessMs?: number;
}
