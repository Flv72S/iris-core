/**
 * MessagingContractSnapshot — Microstep C.1
 * Snapshot immutabile di contratti. Usare Object.freeze prima dell'esposizione.
 */

import type { MessagingContract } from './MessagingContract';

export interface MessagingContractSnapshot {
  readonly contracts: readonly MessagingContract[];
  readonly derivedAt: string;
}
