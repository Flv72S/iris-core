/**
 * ActivitySignalAdapter — Legge eventi attività. Read-only, stub reale.
 */

import type { SignalAdapter } from '../SignalAdapter';
import type { SignalEvent } from '../SignalEvent';
import { ACTIVITY_SIGNAL_ADAPTER_COMPONENT_ID } from '../SignalAdapterKillSwitch';

const BASE_TS = 1704110400000;

function event(evt: SignalEvent): SignalEvent {
  return Object.freeze({
    ...evt,
    payload: Object.freeze(evt.payload),
  });
}

export const activitySignalAdapter: SignalAdapter = {
  id: ACTIVITY_SIGNAL_ADAPTER_COMPONENT_ID,
  async read(): Promise<readonly SignalEvent[]> {
    const events: SignalEvent[] = [
      event({
        id: 'activity-evt-1',
        source: 'activity',
        type: 'SESSION_ACTIVE',
        occurredAt: BASE_TS,
        receivedAt: BASE_TS + 50,
        payload: { sessionId: 's1', lastActivityAt: BASE_TS },
      }),
    ];
    return Object.freeze(events);
  },
};
