/**
 * ExecutionFeedbackEventType — C.5
 * Tassonomia controllata degli eventi di feedback. Solo osservazione.
 */

export const EXECUTION_FEEDBACK_EVENT_TYPES = [
  'DISPATCHED',
  'DELIVERED',
  'FAILED',
  'ACKNOWLEDGED',
  'READ',
  'TIMEOUT',
  'CANCELLED',
] as const;

export type ExecutionFeedbackEventType =
  (typeof EXECUTION_FEEDBACK_EVENT_TYPES)[number];
