/**
 * ExecutionFeedbackEvent — C.5
 * Evento dichiarativo. MUST NOT: retry, nextAction, recommendation, priority, score.
 */

import type { ExecutionFeedbackEventType } from './ExecutionFeedbackEventType';
import type { ExecutionStatus } from './ExecutionStatus';

export interface ExecutionFeedbackEvent {
  readonly eventId: string;
  readonly actionPlanId: string;
  readonly executionId: string;
  readonly eventType: ExecutionFeedbackEventType;
  readonly status: ExecutionStatus;
  readonly observedAt: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
