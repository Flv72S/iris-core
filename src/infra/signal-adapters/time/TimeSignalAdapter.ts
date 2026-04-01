/**
 * TimeSignalAdapter — Legge segnali tempo. Read-only, stub reale.
 */

import type { SignalAdapter } from '../SignalAdapter';
import type { SignalEvent } from '../SignalEvent';
import { TIME_SIGNAL_ADAPTER_COMPONENT_ID } from '../SignalAdapterKillSwitch';

const BASE_TS = 1704110400000;

function event(evt: SignalEvent): SignalEvent {
  return Object.freeze({
    ...evt,
    payload: Object.freeze(evt.payload),
  });
}

export const timeSignalAdapter: SignalAdapter = {
  id: TIME_SIGNAL_ADAPTER_COMPONENT_ID,
  async read(): Promise<readonly SignalEvent[]> {
    const events: SignalEvent[] = [
      event({
        id: 'time-evt-1',
        source: 'time',
        type: 'TIME_TICK',
        occurredAt: BASE_TS,
        receivedAt: BASE_TS,
        payload: { epochMs: BASE_TS },
      }),
    ];
    return Object.freeze(events);
  },
};
