/**
 * InboxSignalAdapter — Legge eventi inbox. Read-only, stub reale.
 */

import type { SignalAdapter } from '../SignalAdapter';
import type { SignalEvent } from '../SignalEvent';
import { INBOX_SIGNAL_ADAPTER_COMPONENT_ID } from '../SignalAdapterKillSwitch';

const BASE_TS = 1704110400000;

function event(evt: SignalEvent): SignalEvent {
  return Object.freeze({
    ...evt,
    payload: Object.freeze(evt.payload),
  });
}

export const inboxSignalAdapter: SignalAdapter = {
  id: INBOX_SIGNAL_ADAPTER_COMPONENT_ID,
  async read(): Promise<readonly SignalEvent[]> {
    const events: SignalEvent[] = [
      event({
        id: 'inbox-evt-1',
        source: 'inbox',
        type: 'EMAIL_RECEIVED',
        occurredAt: BASE_TS,
        receivedAt: BASE_TS + 200,
        payload: { from: 'user@example.com', subject: 'Re: Project' },
      }),
    ];
    return Object.freeze(events);
  },
};
