/**
 * IrisDecisionContract — IRIS 11.C
 * Contract dichiarativo tra IRIS Core e Messaging System.
 * Solo snapshot decisionali; read-only. Nessun action, command, trigger, send, execute, delivery, channel, timing, retry, priority operativa.
 */

import type { IrisDecisionArtifactSet } from '../decision';
import type { IrisDecisionEvaluationSnapshot } from '../decision';
import type { IrisDecisionSelectionSnapshot } from '../decision';

export interface IrisDecisionContract {
  readonly artifactSet?: IrisDecisionArtifactSet;
  readonly evaluationSnapshot?: IrisDecisionEvaluationSnapshot;
  readonly selectionSnapshot?: IrisDecisionSelectionSnapshot;
  readonly derivedAt: string;
}
