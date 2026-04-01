/**
 * ExecutionFeedbackKillSwitch — C.5
 * Registry e kill-switch per il Feedback Boundary.
 */

export const EXECUTION_FEEDBACK_COMPONENT_ID = 'messaging-feedback';

export type ExecutionFeedbackRegistry = Record<string, boolean>;

export function isExecutionFeedbackEnabled(
  registry: ExecutionFeedbackRegistry
): boolean {
  return registry[EXECUTION_FEEDBACK_COMPONENT_ID] === true;
}
