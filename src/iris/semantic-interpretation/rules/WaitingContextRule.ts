import type { SignalWindow } from '../../../infra/signal-windowing/SignalWindow';
import type { SemanticRule } from '../SemanticRule';
import type { SemanticSignal } from '../SemanticSignal';

export const waitingContextRule: SemanticRule = {
  id: 'waiting-context',
  produces: 'WAITING_CONTEXT',
  evaluate(windows: readonly SignalWindow[], now: number): SemanticSignal | null {
    let hasTask = false;
    let hasEmail = false;
    const winIds: string[] = [];
    for (const w of windows) {
      for (const e of w.events) {
        if (e.source === 'tasks' && e.type === 'TASK_DUE') {
          hasTask = true;
          if (winIds.indexOf(w.windowId) < 0) winIds.push(w.windowId);
        }
        if (e.source === 'inbox' && e.type === 'EMAIL_RECEIVED') {
          hasEmail = true;
          if (winIds.indexOf(w.windowId) < 0) winIds.push(w.windowId);
        }
      }
    }
    if (!hasTask || !hasEmail || winIds.length === 0) return null;
    return Object.freeze({
      id: 'waiting-context-' + now,
      type: 'WAITING_CONTEXT',
      detectedAt: now,
      sourceWindowIds: Object.freeze(winIds),
      evidence: Object.freeze(['TASK_DUE', 'EMAIL_RECEIVED']),
    });
  },
};
