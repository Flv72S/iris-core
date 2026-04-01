/**
 * TaskSignalAdapter — Legge eventi task. Read-only, stub reale.
 */

import type { SignalAdapter } from '../SignalAdapter';
import type { SignalEvent } from '../SignalEvent';
import { TASKS_SIGNAL_ADAPTER_COMPONENT_ID } from '../SignalAdapterKillSwitch';

const BASE_TS = 1704110400000;

function event(evt: SignalEvent): SignalEvent {
  return Object.freeze({
    ...evt,
    payload: Object.freeze(evt.payload),
  });
}

export const taskSignalAdapter: SignalAdapter = {
  id: TASKS_SIGNAL_ADAPTER_COMPONENT_ID,
  async read(): Promise<readonly SignalEvent[]> {
    const events: SignalEvent[] = [
      event({
        id: 'tasks-evt-1',
        source: 'tasks',
        type: 'TASK_DUE',
        occurredAt: BASE_TS,
        receivedAt: BASE_TS + 100,
        payload: { taskId: 't1', dueAt: BASE_TS + 86400000 },
      }),
    ];
    return Object.freeze(events);
  },
};
