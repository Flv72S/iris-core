/**
 * IrisMessagingContractSnapshot — IRIS 12.2
 * Snapshot immutabile di contratti messaggistici dichiarativi.
 */

import type { IrisMessagingContract } from './IrisMessagingContract';

export interface IrisMessagingContractSnapshot {
  readonly contracts: readonly IrisMessagingContract[];
  readonly derivedAt: string;
}
