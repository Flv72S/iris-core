/**
 * IrisDecisionEvaluationProvider — IRIS 11.2
 * Interfaccia per provider di valutazione dichiarativa.
 * NON filtra artifact; NON ordina; NON decide quale è migliore; NON comunica con execution/delivery.
 */

import type { IrisDecisionArtifactSet } from './IrisDecisionArtifactSet';
import type { IrisDecisionEvaluationNote } from './IrisDecisionEvaluation';

export interface IrisDecisionEvaluationProvider {
  readonly id: string;
  evaluate(artifacts: IrisDecisionArtifactSet): readonly IrisDecisionEvaluationNote[] | null;
}
