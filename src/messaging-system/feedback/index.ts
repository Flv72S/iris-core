/**
 * Feedback Boundary — C.5
 * Layer puramente osservativo e dichiarativo. Nessuna decisione, nessuna retroazione su IRIS.
 */

export type { ExecutionFeedbackEvent } from './ExecutionFeedbackEvent';
export {
  EXECUTION_FEEDBACK_EVENT_TYPES,
  type ExecutionFeedbackEventType,
} from './ExecutionFeedbackEventType';
export {
  EXECUTION_FEEDBACK_STATUS,
  type ExecutionStatus,
} from './ExecutionStatus';
export type { ExecutionFeedbackSnapshot } from './ExecutionFeedbackSnapshot';
export type { ExecutionResultSnapshot } from './ExecutionResultSnapshot';
export {
  EXECUTION_FEEDBACK_COMPONENT_ID,
  isExecutionFeedbackEnabled,
  type ExecutionFeedbackRegistry,
} from './ExecutionFeedbackKillSwitch';
export { ExecutionFeedbackEngine } from './ExecutionFeedbackEngine';
