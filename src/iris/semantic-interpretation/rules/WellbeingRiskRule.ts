/**
 * Wellbeing Risk Rule — WELLBEING_RISK se: SESSION_ACTIVE continuo oltre 90 min, no TIME_TICK.
 */

import type { SignalWindow } from '../../../infra/signal-windowing/SignalWindow';
import type { SemanticRule } from '../SemanticRule';
import type { SemanticSignal } from '../SemanticSignal';

/** Soglia durata continua (ms) oltre la quale si segnala rischio wellbeing */
const CONTINUOUS_SESSION_THRESHOLD_MS = 90 * 60 * 1000;

export const wellbeingRiskRule: SemanticRule = {
  id: 'wellbeing-risk',
  produces: 'WELLBEING_RISK',
  evaluate(windows: readonly SignalWindow[], now: number): SemanticSignal | null {
    const activityWindows = windows.filter((w) =>
      w.events.some((e) => e.source === 'activity' && e.type === 'SESSION_ACTIVE')
    );
    if (activityWindows.length === 0) return null;

    const hasTimeTick = windows.some((w) =>
      w.events.some((e) => e.source === 'time' && e.type === 'TIME_TICK')
    );
    if (hasTimeTick) return null;

    const minStart = Math.min(...activityWindows.map((w) => w.startAt));
    const maxEnd = Math.max(...activityWindows.map((w) => w.endAt));
    const spanMs = maxEnd - minStart;

    if (spanMs >= CONTINUOUS_SESSION_THRESHOLD_MS) {
      return Object.freeze({
        id: `wellbeing-risk-${now}`,
        type: 'WELLBEING_RISK',
        detectedAt: now,
        sourceWindowIds: Object.freeze(activityWindows.map((w) => w.windowId)),
        evidence: Object.freeze(['SESSION_ACTIVE', `span_ms=${spanMs}`]),
      });
    }
    return null;
  },
};
