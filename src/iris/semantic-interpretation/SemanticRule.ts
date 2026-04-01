/**
 * SemanticRule — Regola dichiarativa: una regola → al massimo un segnale.
 * Pura, ispezionabile, nessuna decisione.
 */

import type { SignalWindow } from '../../infra/signal-windowing/SignalWindow';
import type { SemanticSignal, SemanticSignalType } from './SemanticSignal';

export interface SemanticRule {
  readonly id: string;
  readonly produces: SemanticSignalType;
  evaluate(
    windows: readonly SignalWindow[],
    now: number
  ): SemanticSignal | null;
}
