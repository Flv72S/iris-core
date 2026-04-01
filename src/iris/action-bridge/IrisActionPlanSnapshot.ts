/**
 * IrisActionPlanSnapshot — IRIS 12.4
 * Piano d'azione dichiarativo: cosa IRIS ha deciso, cosa sarebbe coerente fare, cosa è compatibile.
 * Senza MAI agire. Snapshot frozen.
 */

import type { IrisActionIntentSnapshot } from './IrisActionIntentSnapshot';
import type { IrisMessagingContractSnapshot } from '../contract/IrisMessagingContractSnapshot';
import type { IrisContractCompatibilitySnapshot } from '../contract/IrisContractCompatibilitySnapshot';

export interface IrisActionPlanSnapshot {
  readonly intents: IrisActionIntentSnapshot;
  readonly contracts: IrisMessagingContractSnapshot;
  readonly compatibility: IrisContractCompatibilitySnapshot;
  readonly derivedAt: string;
}
