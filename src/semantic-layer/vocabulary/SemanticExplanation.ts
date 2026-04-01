/**
 * SemanticExplanation — 8.1.2 §3.5
 * Strato narrativo opzionale.
 *
 * Contratto: NON fa parte del Read Model 7.5; NON attribuisce intenzionalità alla Fase 7; sempre removibile.
 */

/** Testo localizzabile (chiave o testo). */
export type LocalizedText = string;

/** Reason code dichiarato (non tecnico 7.x). */
export type DeclaredReason = string;

/**
 * SemanticExplanation — forma vincolante 8.1.2.
 * optional MUST be true.
 */
export interface SemanticExplanation {
  readonly message: LocalizedText;
  readonly reasonCode?: DeclaredReason;
  readonly optional: true;
}

export const SEMANTIC_EXPLANATION_CONTRACT =
  'SemanticExplanation is NOT part of Read Model 7.5; MUST NOT attribute intent to Phase 7; MUST be removable.';
