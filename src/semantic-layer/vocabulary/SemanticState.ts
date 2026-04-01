/**
 * SemanticState — 8.1.2 §3.1
 * Stato interpretativo derivato, non persistente, overlay.
 *
 * Contratto: NON è stato tecnico; NON sostituisce 7.1.2 o 7.6; NON modifica il comportamento base.
 * Vocabolario CHIUSO. MUST NOT aggiungere nuovi id senza nuova fase.
 */

/** Identificatori ammessi per SemanticState. Vietati: correct, optimal, should_do, best_choice. */
export type SemanticStateId =
  | 'active'
  | 'inactive'
  | 'at_risk'
  | 'eligible'
  | 'recommended';

/** Scope applicativo dello stato (es. entità, lista, sessione). */
export type SemanticScope = string;

/** Validità temporale overlay. */
export interface TemporalValidity {
  readonly validFrom: number;
  readonly validUntil: number;
}

/**
 * SemanticState — forma vincolante 8.1.2.
 * killSwitchable MUST be true. Non sostituisce stati tecnici Phase 7.
 */
export interface SemanticState {
  readonly id: SemanticStateId;
  readonly scope: SemanticScope;
  readonly validity: TemporalValidity;
  readonly killSwitchable: true;
}

export const SEMANTIC_STATE_CONTRACT =
  'SemanticState is overlay only; MUST NOT replace 7.1.2 or 7.6 technical state.';
