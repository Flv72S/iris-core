/**
 * IRIS 11.0 / 11.1 — Decision Plane
 * Artefatti decisionali dichiarativi. Nessuna esecuzione, nessun side-effect.
 */

export type { IrisDecisionModel, IrisDecisionEntry } from './IrisDecisionModel';
export type { IrisDecisionSnapshot } from './IrisDecisionSnapshot';
export type { IrisDecisionArtifact } from './IrisDecisionArtifact';
export type { IrisDecisionArtifactSet } from './IrisDecisionArtifactSet';
export type { IrisDecisionProducer, IrisDecisionProducerInput } from './IrisDecisionProducer';
export type { IrisDecisionEvaluationNote } from './IrisDecisionEvaluation';
export type { IrisDecisionEvaluationSnapshot } from './IrisDecisionEvaluationSnapshot';
export type { IrisDecisionEvaluationProvider } from './IrisDecisionEvaluationProvider';
export type { IrisDecisionSelection } from './IrisDecisionSelection';
export type { IrisDecisionSelectionSnapshot } from './IrisDecisionSelectionSnapshot';
export type { IrisDecisionSelectionProvider } from './IrisDecisionSelectionProvider';
export {
  IRIS_DECISION_COMPONENT_ID,
  isDecisionEnabled,
  type DecisionRegistry,
} from './IrisDecisionKillSwitch';
export { IrisDecisionEngine } from './IrisDecisionEngine';
export { IrisDecisionArtifactEngine } from './IrisDecisionArtifactEngine';
export { IrisDecisionEvaluationEngine } from './IrisDecisionEvaluationEngine';
export { IrisDecisionSelectionEngine } from './IrisDecisionSelectionEngine';
