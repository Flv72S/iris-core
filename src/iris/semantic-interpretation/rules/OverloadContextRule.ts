import type { SignalWindow } from '../../../infra/signal-windowing/SignalWindow';
import type { SemanticRule } from '../SemanticRule';
import type { SemanticSignal } from '../SemanticSignal';

/** Soglia minima finestre attive per overload */
const MIN_WINDOWS = 3;
/** Soglia minima eventi STABLE totali */
const MIN_STABLE = 5;

export const overloadContextRule: SemanticRule = {
  id: 'overload-context',
  produces: 'OVERLOAD_CONTEXT',
  evaluate(windows: readonly SignalWindow[], now: number): SemanticSignal | null {
    let stable = 0;
    const winIds: string[] = [];
    for (const w of windows) {
      winIds.push(w.windowId);
      for (const e of w.events) {
        if (e.quality === 'STABLE') stable++;
      }
    }
    if (windows.length < MIN_WINDOWS || stable < MIN_STABLE) return null;
    return Object.freeze({
      id: `overload-context-${now}`,
      type: 'OVERLOAD_CONTEXT',
      detectedAt: now,
      sourceWindowIds: Object.freeze(winIds),
      evidence: Object.freeze([`windows=${windows.length}`, `stable=${stable}`]),
    });
  },
};
