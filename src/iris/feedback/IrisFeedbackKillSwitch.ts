/**
 * IrisFeedbackKillSwitch — IRIS 10.2
 * Kill-switch per il layer Feedback. Se OFF, collect() restituisce snapshot con events [].
 */

export const IRIS_FEEDBACK_COMPONENT_ID = 'iris-feedback';

export interface FeedbackRegistry {
  isEnabled(componentId: string): boolean;
}

export function isFeedbackEnabled(registry: FeedbackRegistry): boolean {
  return registry.isEnabled(IRIS_FEEDBACK_COMPONENT_ID);
}
