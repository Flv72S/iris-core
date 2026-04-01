/**
 * CalendarSignalAdapter — Legge eventi calendario. Read-only, stub reale.
 */

import type { SignalAdapter } from '../SignalAdapter';
import type { SignalEvent } from '../SignalEvent';
import { CALENDAR_SIGNAL_ADAPTER_COMPONENT_ID } from '../SignalAdapterKillSwitch';

const BASE_TS = 1704110400000;

function event(evt: SignalEvent): SignalEvent {
  return Object.freeze({
    ...evt,
    payload: Object.freeze(evt.payload),
  });
}

export const calendarSignalAdapter: SignalAdapter = {
  id: CALENDAR_SIGNAL_ADAPTER_COMPONENT_ID,
  async read(): Promise<readonly SignalEvent[]> {
    const events: SignalEvent[] = [
      event({
        id: 'calendar-evt-1',
        source: 'calendar',
        type: 'MEETING_STARTED',
        occurredAt: BASE_TS,
        receivedAt: BASE_TS + 5000,
        payload: Object.freeze({ title: 'Weekly sync', durationMinutes: 30 }),
      }),
    ];
    return Object.freeze(events);
  },
};
