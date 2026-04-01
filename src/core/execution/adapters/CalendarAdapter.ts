/**
 * CalendarAdapter — Stub log-only. Nessuna integrazione reale.
 */

import type { ExecutionAction } from '../ExecutionAction';
import type { ExecutionResult } from '../ExecutionResult';
import type { ExecutionAdapter } from './ExecutionAdapter';

export const calendarAdapter: ExecutionAdapter = {
  actionType: 'SCHEDULE_EVENT',
  execute(action: ExecutionAction, now: number): ExecutionResult {
    return Object.freeze({ status: 'EXECUTED', executedAt: now });
  },
};
