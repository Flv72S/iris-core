/**
 * IrisDecisionSelectionSnapshot — IRIS 11.3
 * Snapshot immutabile di selezioni dichiarate. Può contenere 0 o più selezioni.
 */

import type { IrisDecisionSelection } from './IrisDecisionSelection';

export interface IrisDecisionSelectionSnapshot {
  readonly selections: readonly IrisDecisionSelection[];
  readonly derivedAt: string;
}
