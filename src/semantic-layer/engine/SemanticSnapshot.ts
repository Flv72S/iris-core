/**
 * SemanticSnapshot — 8.2.0
 * Contenitore overlay separato dal Read Model 7. Inizialmente vuoto; nessuna semantica attiva.
 */

import type {
  SemanticState,
  SemanticContext,
  SemanticRanking,
  SemanticExplanation,
  SemanticPolicy,
} from '../vocabulary';

/**
 * Snapshot degli overlay semantici. NON fa parte del Read Model 7.5.
 * Può contenere solo primitive 8.1.2. In 8.2.0 è sempre vuoto.
 */
export interface SemanticSnapshot {
  readonly states: readonly SemanticState[];
  readonly contexts: readonly SemanticContext[];
  readonly rankings: readonly SemanticRanking[];
  readonly explanations: readonly SemanticExplanation[];
  readonly policies: readonly SemanticPolicy[];
}

const EMPTY_SNAPSHOT: SemanticSnapshot = Object.freeze({
  states: Object.freeze([]),
  contexts: Object.freeze([]),
  rankings: Object.freeze([]),
  explanations: Object.freeze([]),
  policies: Object.freeze([]),
});

/**
 * Restituisce uno snapshot vuoto. Comportamento = Fase 7 pura (nessun overlay).
 */
export function createEmptySnapshot(): SemanticSnapshot {
  return EMPTY_SNAPSHOT;
}

/**
 * Verifica se lo snapshot è vuoto (nessun overlay applicato).
 */
export function isEmptySnapshot(snapshot: SemanticSnapshot): boolean {
  return (
    snapshot.states.length === 0 &&
    snapshot.contexts.length === 0 &&
    snapshot.rankings.length === 0 &&
    snapshot.explanations.length === 0 &&
    snapshot.policies.length === 0
  );
}
