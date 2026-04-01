/**
 * CalendarDomainExecutor — Esecutore dominio calendario/eventi.
 */

import type { DomainExecutor } from './DomainExecutor';
import type { ActionIntent } from '../action-intent';
import type { ExecutionAction } from '../ExecutionAction';
import { calendarAdapter } from '../adapters/CalendarAdapter';

export const calendarDomainExecutor: DomainExecutor = Object.freeze({
  actionType: 'SCHEDULE_EVENT',
  execute(intent: ActionIntent, now: number) {
    const action: ExecutionAction = Object.freeze({
      id: intent.intentId,
      type: 'SCHEDULE_EVENT',
      payload: intent.payload,
      requestedAt: intent.requestedAt,
      sourceFeature: intent.sourceFeature,
    });
    return calendarAdapter.execute(action, now);
  },
});
