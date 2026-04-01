/**
 * IrisContractCompatibilitySnapshot — IRIS 12.3
 * Snapshot dichiarativo: contratti, capability e note di compatibilità descrittive.
 * MUST NOT: scegliere, filtrare, eseguire.
 */

import type { IrisMessagingContract } from './IrisMessagingContract';
import type { IrisExecutionCapability } from './IrisExecutionCapability';

/** Nota descrittiva di compatibilità. Non implica selezione né esecuzione. */
export interface IrisCompatibilityNote {
  readonly description: string;
}

export interface IrisContractCompatibilitySnapshot {
  readonly contracts: readonly IrisMessagingContract[];
  readonly capabilities: readonly IrisExecutionCapability[];
  readonly compatibilityNotes: readonly IrisCompatibilityNote[];
}
