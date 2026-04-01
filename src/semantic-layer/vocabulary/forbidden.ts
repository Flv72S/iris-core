/**
 * Forbidden vocabulary — 8.1.2 §4
 *
 * I seguenti concetti MUST NOT esistere in Fase 8.
 * Nessun tipo, stato o termine di questo elenco MAY essere introdotto.
 * Se servono → nuova fase architetturale.
 */

/** Termini semantici VIETATI. NON definire tipi con questi nomi. NON usare come SemanticStateId o simili. */
export const FORBIDDEN_SEMANTIC_TERMS: readonly string[] = Object.freeze([
  'SemanticTruth',
  'OptimalDecision',
  'CorrectAction',
  'SystemGoal',
  'UserScore',
  'Merit',
  'Penalty',
  'correct',
  'optimal',
  'should_do',
  'best_choice',
]);

/**
 * Verifica che un identificatore non sia nel vocabolario vietato.
 * Usabile a runtime per guardrail aggiuntivi. Il vocabolario TypeScript (SemanticStateId etc.) è la fonte primaria di chiusura.
 */
export function isForbiddenTerm(term: string): boolean {
  return FORBIDDEN_SEMANTIC_TERMS.includes(term);
}

export const FORBIDDEN_VOCABULARY_CONTRACT =
  'Terms in FORBIDDEN_SEMANTIC_TERMS MUST NOT exist as types or semantic identifiers in Phase 8.';
