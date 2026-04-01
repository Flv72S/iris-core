/**
 * Focus Context Rule — FOCUS_CONTEXT se: calendar MEETING_STARTED, assenza di EMAIL_RECEIVED/TASK_DUE.
 */
import type { SignalWindow } from '../../../infra/signal-windowing/SignalWindow';
import type { SemanticRule } from '../SemanticRule';
import type { SemanticSignal } from '../SemanticSignal';

export const focusContextRule: SemanticRule = {
  id: 'focus-context',
  produces: 'FOCUS_CONTEXT',
  evaluate(windows: readonly SignalWindow[], now: number): SemanticSignal | null {
    let hasMeeting = false;
    const winIds: string[] = [];
    let hasEmailOrTask = false;
    for (const w of windows) {
      for (const e of w.events) {
        if (e.source === 'calendar' && e.type === 'MEETING_STARTED') {
          hasMeeting = true;
          winIds.push(w.windowId);
        }
        if (e.source === 'inbox' && e.type === 'EMAIL_RECEIVED') hasEmailOrTask = true;
        if (e.source === 'tasks' && e.type === 'TASK_DUE') hasEmailOrTask = true;
      }
    }
    if (!hasMeeting || hasEmailOrTask || winIds.length === 0) return null;
    return Object.freeze({
      id: 'focus-context-' + String(now),
      type: 'FOCUS_CONTEXT',
      detectedAt: now,
      sourceWindowIds: Object.freeze(winIds),
      evidence: Object.freeze(['calendar:MEETING_STARTED']),
    });
  },
};
