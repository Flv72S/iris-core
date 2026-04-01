/**
 * IrisInterpretation — IRIS 9.0
 * Modello interpretativo prodotto-specifico. Descrittivo; NON decisionale.
 * confidence è opaca, NON usata per scelta o ordinamento.
 */

import type { SemanticState, SemanticContext } from '../../semantic-layer';

export interface IrisInterpretation {
  readonly id: string;
  /** Descrittiva, non valutativa. */
  readonly label: string;
  readonly sourceStates: readonly SemanticState[];
  readonly sourceContexts?: readonly SemanticContext[];
  readonly notes?: readonly string[];
  /** Opaca, NON probabilistica, NON decisionale. */
  readonly confidence?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
