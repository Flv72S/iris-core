/**
 * Read Metrics — PORTA (contratto, non implementazione)
 * Interfacce dichiarative per metriche osservabili del read-side.
 */

/**
 * Parametri per evento cache hit.
 */
export interface OnCacheHitParams {
  readonly cacheKey: string;
  readonly readModel: string;
}

/**
 * Parametri per evento cache miss.
 */
export interface OnCacheMissParams {
  readonly cacheKey: string;
  readonly readModel: string;
}

/**
 * Parametri per lag di proiezione.
 */
export interface OnProjectionLagParams {
  readonly readModel: string;
  readonly lagMs: number;
}

/**
 * Parametri per latenza di read.
 */
export interface OnReadLatencyParams {
  readonly readModel: string;
  readonly latencyMs: number;
}

/**
 * Porta per metriche del read-side.
 * Nessuna implementazione, solo contratto.
 */
export interface ReadMetrics {
  onCacheHit(params: OnCacheHitParams): void;
  onCacheMiss(params: OnCacheMissParams): void;
  onProjectionLag(params: OnProjectionLagParams): void;
  onReadLatency(params: OnReadLatencyParams): void;
}
