/**
 * Read SLA — contratto dichiarativo
 * Definisce aspettative e limiti del read-side (latenza, staleness, cache).
 * Nessuna logica, nessuna misurazione, nessun enforcement.
 */

/**
 * Contratto SLA per il read-side.
 * Tutti i valori sono numeri primitivi (millisecondi).
 */
export interface ReadSLA {
  /** Latenza massima accettabile per la risposta read (ms). */
  readonly maxLatencyMs?: number;
  /** Staleness massima accettabile del read model (ms). */
  readonly maxStalenessMs?: number;
  /** TTL suggerito per la cache (ms). */
  readonly cacheTTLms?: number;
}
