/**
 * ExecutionFeedbackEngine — C.5
 * Trasforma risultati di esecuzione in eventi osservativi. Nessuna deduplicazione, correlazione o inferenza.
 */

import type { ExecutionResultSnapshot } from './ExecutionResultSnapshot';
import type { ExecutionFeedbackSnapshot } from './ExecutionFeedbackSnapshot';
import type { ExecutionFeedbackEvent } from './ExecutionFeedbackEvent';
import type { ExecutionFeedbackEventType } from './ExecutionFeedbackEventType';
import type { ExecutionStatus } from './ExecutionStatus';
import type { ExecutionFeedbackRegistry } from './ExecutionFeedbackKillSwitch';
import { isExecutionFeedbackEnabled } from './ExecutionFeedbackKillSwitch';

function observedAtFromCompletedAt(completedAt: string): number {
  const t = new Date(completedAt).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function deriveStatusFromResults(snapshot: ExecutionResultSnapshot): ExecutionStatus {
  if (snapshot.status != null) {
    const s = snapshot.status.toUpperCase();
    if (s === 'SUCCESS') return 'SUCCESS';
    if (s === 'FAILED' || s === 'FAILURE') return 'FAILURE';
    if (s === 'SKIPPED') return 'UNKNOWN';
    if (s === 'PARTIAL') return 'PARTIAL';
  }
  const results = snapshot.results;
  if (results.length === 0) return 'UNKNOWN';
  const hasFailure = results.some((r) => r.status === 'failure');
  const hasPartial = results.some((r) => r.status === 'partial');
  if (hasFailure) return 'FAILURE';
  if (hasPartial) return 'PARTIAL';
  return 'SUCCESS';
}

function eventTypeFromStatus(status: ExecutionStatus): ExecutionFeedbackEventType {
  switch (status) {
    case 'SUCCESS':
      return 'DELIVERED';
    case 'FAILURE':
      return 'FAILED';
    case 'PARTIAL':
      return 'ACKNOWLEDGED';
    default:
      return 'CANCELLED';
  }
}

function resultToEvent(
  snapshot: ExecutionResultSnapshot,
  index: number,
  derivedAt: number
): ExecutionFeedbackEvent {
  const status = deriveStatusFromResults(snapshot);
  const eventType = eventTypeFromStatus(status);
  const observedAt = observedAtFromCompletedAt(snapshot.completedAt);
  return Object.freeze({
    eventId: `fb-${snapshot.executionId}-${index}`,
    actionPlanId: snapshot.planId ?? snapshot.executionId,
    executionId: snapshot.executionId,
    eventType,
    status,
    observedAt,
    metadata:
      snapshot.results.length > 0
        ? Object.freeze({ stepCount: snapshot.results.length })
        : undefined,
  });
}

export class ExecutionFeedbackEngine {
  constructor() {}

  collect(
    executionResults: ExecutionResultSnapshot | readonly ExecutionResultSnapshot[],
    registry: ExecutionFeedbackRegistry
  ): ExecutionFeedbackSnapshot {
    const derivedAt =
      typeof executionResults === 'object' && Array.isArray(executionResults)
        ? executionResults.length > 0 && executionResults[0].completedAt
          ? observedAtFromCompletedAt(executionResults[0].completedAt)
          : 0
        : observedAtFromCompletedAt(executionResults.completedAt);

    if (!isExecutionFeedbackEnabled(registry)) {
      return Object.freeze({
        events: Object.freeze([]),
        derivedAt,
      });
    }

    const list = Array.isArray(executionResults)
      ? executionResults
      : [executionResults];
    const events = list.map((r, i) => resultToEvent(r, i, derivedAt));

    return Object.freeze({
      events: Object.freeze(events.map((e) => Object.freeze(e))),
      derivedAt,
    });
  }
}
