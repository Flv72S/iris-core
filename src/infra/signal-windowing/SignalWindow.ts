/**
 * SignalWindow — Finestra temporale di eventi qualificati.
 * MUST NOT: summary, interpretation, label, priority, score.
 */

import type { QualifiedSignalEvent } from '../signal-quality/QualifiedSignalEvent';

export interface SignalWindow {
  readonly windowId: string;
  readonly startAt: number;
  readonly endAt: number;
  readonly events: readonly QualifiedSignalEvent[];
  readonly createdAt: number;
}
