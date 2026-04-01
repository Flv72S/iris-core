/**
 * ActionIntent fixtures — one per domain: inbox, tasks, calendar, focus.
 * Static, deterministic. requestedAtIso for reproducible timestamps.
 */

import type { ActionIntentFixture } from './types';

const T0 = '2025-01-15T10:00:00.000Z';

export const INBOX_BLOCK_INPUT: ActionIntentFixture = Object.freeze({
  id: 'intent-inbox-block',
  domain: 'inbox',
  type: 'BLOCK_INPUT',
  payload: { blockReason: 'focus-mode' },
  resolutionId: 'res-fixture-allowed',
  sourceFeature: 'Focus',
  requestedAtIso: T0,
  idempotencyKey: 'idem-inbox-block-1',
});

export const INBOX_DEFER_MESSAGE: ActionIntentFixture = Object.freeze({
  id: 'intent-inbox-defer',
  domain: 'inbox',
  type: 'DEFER_MESSAGE',
  payload: { messageId: 'msg-1', until: T0 },
  resolutionId: 'res-fixture-allowed',
  sourceFeature: 'Wellbeing',
  requestedAtIso: T0,
  idempotencyKey: 'idem-inbox-defer-1',
});

export const CALENDAR_SCHEDULE: ActionIntentFixture = Object.freeze({
  id: 'intent-calendar-schedule',
  domain: 'calendar',
  type: 'SCHEDULE_EVENT',
  payload: { title: 'Deep work', start: T0, end: '2025-01-15T11:00:00.000Z' },
  resolutionId: 'res-fixture-allowed',
  sourceFeature: 'Focus',
  requestedAtIso: T0,
  idempotencyKey: 'idem-calendar-1',
});

export const FOCUS_NOTIFICATION: ActionIntentFixture = Object.freeze({
  id: 'intent-focus-notification',
  domain: 'focus',
  type: 'SEND_NOTIFICATION',
  payload: { title: 'Focus mode on', body: 'Notifications muted' },
  resolutionId: 'res-fixture-allowed',
  sourceFeature: 'Focus',
  requestedAtIso: T0,
  idempotencyKey: 'idem-focus-notif-1',
});

export const TASKS_SCHEDULE: ActionIntentFixture = Object.freeze({
  id: 'intent-tasks-schedule',
  domain: 'tasks',
  type: 'SCHEDULE_EVENT',
  payload: { taskId: 'task-1', due: T0 },
  resolutionId: 'res-fixture-allowed',
  sourceFeature: 'Wellbeing',
  requestedAtIso: T0,
  idempotencyKey: 'idem-tasks-1',
});

export const ALL_ACTION_INTENT_FIXTURES: readonly ActionIntentFixture[] = Object.freeze([
  INBOX_BLOCK_INPUT,
  INBOX_DEFER_MESSAGE,
  CALENDAR_SCHEDULE,
  FOCUS_NOTIFICATION,
  TASKS_SCHEDULE,
]);
