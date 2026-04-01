/**
 * Idle Context Rule — IDLE_CONTEXT se: nessuna finestra significativa,
 * solo eventi RAW o assenti.
 */

import type { SignalWindow } from '../../../infra/signal-windowing/SignalWindow';
import type { SemanticRule } from '../SemanticRule';
import type { SemanticSignal } from '../SemanticSignal';

/** Finestra "significativa" = almeno un evento non RAW */
function hasSignificantEvent(w: SignalWindow): boolean {
  return w.events.some((e) => e.quality !== 'RAW');
}

export const idleContextRule: SemanticRule = {
  id: 'idle-context',
  produces: 'IDLE_CONTEXT',
  evaluate(windows: readonly SignalWindow[], now: number): SemanticSignal | null {
    if (windows.length === 0) {
      return Object.freeze({
        id: `idle-context-${now}`,
        type: 'IDLE_CONTEXT',
        detectedAt: now,
        sourceWindowIds: Object.freeze([]),
        evidence: Object.freeze(['no windows']),
      });
    }

    const significant = windows.filter(hasSignificantEvent);
    if (significant.length === 0) {
      return Object.freeze({
        id: `idle-context-${now}`,
        type: 'IDLE_CONTEXT',
        detectedAt: now,
        sourceWindowIds: Object.freeze(windows.map((w) => w.windowId)),
        evidence: Object.freeze(['only RAW or empty windows']),
      });
    }
    return null;
  },
};
