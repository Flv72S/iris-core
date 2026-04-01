/**
 * Domain executors — Fase 7.1. Azioni atomiche, deterministiche, idempotenti.
 */

export type { DomainExecutor } from './DomainExecutor';
export { notificationDomainExecutor } from './NotificationDomainExecutor';
export { calendarDomainExecutor } from './CalendarDomainExecutor';
export { blockInputDomainExecutor, deferMessageDomainExecutor } from './InboxDomainExecutor';

import type { DomainExecutor } from './DomainExecutor';
import type { ExecutionActionType } from '../ExecutionAction';
import { notificationDomainExecutor } from './NotificationDomainExecutor';
import { calendarDomainExecutor } from './CalendarDomainExecutor';
import { blockInputDomainExecutor, deferMessageDomainExecutor } from './InboxDomainExecutor';

export const DEFAULT_DOMAIN_EXECUTORS: Readonly<Record<ExecutionActionType, DomainExecutor>> =
  Object.freeze({
    SEND_NOTIFICATION: notificationDomainExecutor,
    SCHEDULE_EVENT: calendarDomainExecutor,
    BLOCK_INPUT: blockInputDomainExecutor,
    DEFER_MESSAGE: deferMessageDomainExecutor,
  });
