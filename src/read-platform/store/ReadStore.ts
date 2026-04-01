/**
 * Read Store — PORTA (read-side storage)
 * Contratto per salvare e recuperare Read Model. Separato dal write DB.
 * Nessuna logica di business, nessun coupling con projection o runner.
 */

/** Modello con identificativo stringa (minimo per la porta). */
export interface WithId {
  readonly id: string;
}

/**
 * Porta di storage read-side: operazioni minime.
 * T deve essere serializzabile e dotato di id.
 */
export interface ReadStore<T extends WithId> {
  upsert(model: T): Promise<void>;
  getById(id: string): Promise<T | undefined>;
  deleteById(id: string): Promise<void>;
}
