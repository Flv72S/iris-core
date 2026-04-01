/**
 * Ranking — 8.2.2 Priority, Ranking & Weighting Model
 * Valori primitivi per ordinamento descrittivo. Nessuna logica; nessuna comparazione implicita.
 */

import type { SemanticState } from '../vocabulary';

/**
 * SemanticRank — posizione desiderata in un ordine dichiarato.
 * Valore minore = posizione precedente (asc). Primitivo; opzionale.
 */
export type SemanticRank = number;

/**
 * SemanticPriority — priorità dichiarata per ordinamento.
 * Valore maggiore = posizione precedente. Primitivo; opzionale.
 */
export type SemanticPriority = number;

/**
 * SemanticWeight — peso per ordinamento.
 * Valore maggiore = posizione precedente. Primitivo; opzionale.
 */
export type SemanticWeight = number;

/**
 * SemanticState con attributi di ordinamento opzionali (8.2.2).
 * Rank/priority/weight sono solo dati; NON attivano decisioni o selezione.
 */
export interface RankableSemanticState extends SemanticState {
  readonly rank?: SemanticRank;
  readonly priority?: SemanticPriority;
  readonly weight?: SemanticWeight;
}

export type OrderByField = 'rank' | 'priority' | 'weight';
export type OrderDirection = 'Asc' | 'Desc';

/**
 * Opzioni di ordinamento dichiarate. Deterministiche; nessuna semantica implicita.
 */
export interface OrderingOptions {
  readonly orderBy: OrderByField;
  readonly direction: OrderDirection;
}
