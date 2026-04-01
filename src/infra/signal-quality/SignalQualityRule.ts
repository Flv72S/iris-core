/**
 * SignalQualityRule — Regola meccanica, pura e deterministica.
 * Nessun side-effect, nessuna conoscenza del "perché" del segnale.
 */

import type { QualifiedSignalEvent } from './QualifiedSignalEvent';

export interface SignalQualityRule {
  readonly id: string;
  apply(events: readonly QualifiedSignalEvent[]): readonly QualifiedSignalEvent[];
}
