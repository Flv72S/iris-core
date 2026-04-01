/**
 * IrisDecisionContractSnapshot — IRIS 11.C
 * Snapshot immutabile del contract. Completamente read-only e frozen.
 */

import type { IrisDecisionContract } from './IrisDecisionContract';

export interface IrisDecisionContractSnapshot extends IrisDecisionContract {
  readonly artifactSet?: IrisDecisionContract['artifactSet'];
  readonly evaluationSnapshot?: IrisDecisionContract['evaluationSnapshot'];
  readonly selectionSnapshot?: IrisDecisionContract['selectionSnapshot'];
  readonly derivedAt: string;
}
