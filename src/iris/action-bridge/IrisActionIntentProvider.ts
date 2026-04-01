/**
 * IrisActionIntentProvider — IRIS 12.0
 * Fornisce intent dichiarativi da una selection snapshot. Nessuna esecuzione, nessuna comunicazione con delivery/adapter.
 */

import type { IrisDecisionSelectionSnapshot } from '../decision';
import type { IrisActionIntent } from './IrisActionIntent';

export interface IrisActionIntentProvider {
  readonly id: string;
  derive(selectionSnapshot: IrisDecisionSelectionSnapshot): readonly IrisActionIntent[] | null;
}
