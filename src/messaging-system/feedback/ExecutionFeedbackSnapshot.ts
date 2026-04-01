/**
 * ExecutionFeedbackSnapshot — C.5
 * Snapshot immutabile degli eventi di feedback.
 */

import type { ExecutionFeedbackEvent } from './ExecutionFeedbackEvent';

export interface ExecutionFeedbackSnapshot {
  readonly events: readonly ExecutionFeedbackEvent[];
  readonly derivedAt: number;
}
