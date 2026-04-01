/**
 * SemanticRanking — 8.1.2 §3.3
 * Strato di ordinamento esplicito, revocabile.
 *
 * Contratto: NON cambia la fonte dati; NON altera l'ordine base Fase 7; sempre disattivabile.
 */

/** Criterio dichiarato (es. "relevance", "recency"). */
export type DeclaredCriteria = string;

export type RankingDirection = 'Asc' | 'Desc';

/**
 * SemanticRanking — forma vincolante 8.1.2.
 * reversible MUST be true.
 */
export interface SemanticRanking {
  readonly criteria: DeclaredCriteria;
  readonly direction: RankingDirection;
  readonly reversible: true;
}

export const SEMANTIC_RANKING_CONTRACT =
  'SemanticRanking is overlay only; MUST NOT change Phase 7 data source or base order.';
