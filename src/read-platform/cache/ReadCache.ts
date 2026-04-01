/**
 * Read Cache — PORTA (storage, non decisione)
 * Operazioni get / set / delete. Nessuna logica di decisione, nessuna conoscenza di SLA o projection.
 */

/**
 * Porta di cache per read-side: get, set, delete.
 * TTL opzionale (ms) applicato solo se fornito dal chiamante.
 */
export interface ReadCache<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
