/**
 * Read SLA Policy — regole di selezione SLA (dichiarative)
 * Associa una chiave logica a una ReadSLA. Nessuna dipendenza da HTTP, route o framework.
 */

import type { ReadSLA } from './ReadSLA';

/** Criticità della richiesta read (es. per selezione SLA). */
export type ReadCriticality = 'critical' | 'standard' | 'best-effort';

/**
 * Policy: mappa chiave logica → ReadSLA.
 * Selezione deterministica: policy[key].
 */
export type ReadSLAPolicy = Partial<Record<ReadCriticality, ReadSLA>>;

/** Chiave per tipo di read model (estensibile). */
export type ReadModelKind = 'thread' | 'message' | string;

/**
 * Policy per tipo di read model: mappa ReadModelKind → ReadSLA.
 */
export type ReadModelSLAPolicy = Partial<Record<ReadModelKind, ReadSLA>>;
