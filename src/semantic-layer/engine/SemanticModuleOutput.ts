/**
 * SemanticModuleOutput — 8.2.1 + 8.2.2
 * Forma del contributo di un modulo allo snapshot. Append-only; ranking opzionale e dichiarato.
 */

import type {
  SemanticState,
  SemanticContext,
  SemanticRanking,
  SemanticExplanation,
  SemanticPolicy,
} from '../vocabulary';
import type { RankableSemanticState } from './Ranking';

/**
 * Contributo opzionale di un SemanticModule allo snapshot.
 * states può includere rank/priority/weight (8.2.2) per ordinamento descrittivo; opzionale.
 * Merge è append-only: nessun override, nessuna deduplicazione, nessuna selezione.
 */
export interface SemanticModuleOutput {
  readonly states?: readonly RankableSemanticState[];
  readonly contexts?: readonly SemanticContext[];
  readonly rankings?: readonly SemanticRanking[];
  readonly explanations?: readonly SemanticExplanation[];
  readonly policies?: readonly SemanticPolicy[];
}

/**
 * Verifica che un valore sia un oggetto con al più le chiavi ammesse e valori array.
 * Validazione di forma; nessuna interpretazione semantica.
 */
export function isModuleOutputShape(value: unknown): value is SemanticModuleOutput {
  if (value === null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  const allowed = new Set(['states', 'contexts', 'rankings', 'explanations', 'policies']);
  for (const k of Object.keys(o)) {
    if (!allowed.has(k)) return false;
    if (o[k] !== undefined && !Array.isArray(o[k])) return false;
  }
  return true;
}
