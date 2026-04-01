import type { ThreadReadModelV1 } from './v1/ThreadReadModel';

/**
 * ThreadReadModel (Query DTO)
 *
 * Re-export da v1 per backward compatibility.
 * Per versioning esplicito usare v1/ o v2/.
 *
 * Vincoli:
 * - Solo campi primitivi / serializzabili
 * - Nessun metodo / logica
 * - Read-only
 */
export type ThreadReadModel = ThreadReadModelV1;

