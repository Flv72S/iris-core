/**
 * IrisMessagingContractProvider — IRIS 12.2
 * Deriva contratti messaggistici da Action Intent Snapshot. Nessun invio, nessuna conoscenza di adapter/canali.
 */

import type { IrisActionIntentSnapshot } from '../action-bridge';
import type { IrisMessagingContract } from './IrisMessagingContract';

export interface IrisMessagingContractProvider {
  readonly id: string;
  derive(intentSnapshot: IrisActionIntentSnapshot): readonly IrisMessagingContract[] | null;
}
