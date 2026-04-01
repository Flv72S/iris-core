/**
 * IRIS 10.2 — Feedback & Observation
 * Raccolta passiva di segnali; normalizzazione in eventi. Osserva; non interpreta.
 */

export type { IrisFeedbackAdapter } from './IrisFeedbackAdapter';
export type { IrisFeedbackEvent } from './IrisFeedbackEvent';
export type { IrisFeedbackSignal } from './IrisFeedbackSignal';
export type { IrisFeedbackSnapshot } from './IrisFeedbackSnapshot';
export {
  IRIS_FEEDBACK_COMPONENT_ID,
  isFeedbackEnabled,
  type FeedbackRegistry,
} from './IrisFeedbackKillSwitch';
export { IrisFeedbackEngine } from './IrisFeedbackEngine';
