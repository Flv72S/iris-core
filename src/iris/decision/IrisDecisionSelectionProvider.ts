/**
 * IrisDecisionSelectionProvider — IRIS 11.3
 * Interfaccia per provider di selezione dichiarativa.
 * Dichiara una selezione; non attiva nulla; non comunica con execution/delivery.
 */

import type { IrisDecisionArtifactSet } from './IrisDecisionArtifactSet';
import type { IrisDecisionEvaluationSnapshot } from './IrisDecisionEvaluationSnapshot';
import type { IrisDecisionSelection } from './IrisDecisionSelection';

export interface IrisDecisionSelectionProvider {
  readonly id: string;
  select(
    artifacts: IrisDecisionArtifactSet,
    evaluations?: IrisDecisionEvaluationSnapshot
  ): readonly IrisDecisionSelection[] | null;
}
