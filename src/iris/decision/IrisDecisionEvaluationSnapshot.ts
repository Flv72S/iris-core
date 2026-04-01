/**
 * IrisDecisionEvaluationSnapshot — IRIS 11.2
 * Snapshot immutabile di note di valutazione. Object.freeze.
 */

import type { IrisDecisionEvaluationNote } from './IrisDecisionEvaluation';

export interface IrisDecisionEvaluationSnapshot {
  readonly notes: readonly IrisDecisionEvaluationNote[];
  readonly derivedAt: string;
}
