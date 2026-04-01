/**
 * SignalWindowingStrategy — Strategia pura, nessuna memoria interna, nessun side-effect.
 */

import type { QualifiedSignalEvent } from '../signal-quality/QualifiedSignalEvent';
import type { SignalWindow } from './SignalWindow';

export interface SignalWindowingStrategy {
  readonly id: string;
  build(
    events: readonly QualifiedSignalEvent[],
    now: number
  ): readonly SignalWindow[];
}
