/**
 * IrisMessagingContractEngine — IRIS 12.2
 * Deriva contratti messaggistici da Action Intent Snapshot. Kill-switch OFF → contracts [].
 * Accumulo, non selezione. Output frozen.
 */

import type { IrisActionIntentSnapshot } from '../action-bridge';
import type { IrisMessagingContractProvider } from './IrisMessagingContractProvider';
import type { IrisMessagingContract } from './IrisMessagingContract';
import type { IrisMessagingContractSnapshot } from './IrisMessagingContractSnapshot';
import type { MessagingContractRegistry } from './IrisMessagingContractKillSwitch';
import { isMessagingContractEnabled } from './IrisMessagingContractKillSwitch';

export class IrisMessagingContractEngine {
  constructor(private readonly providers: readonly IrisMessagingContractProvider[]) {}

  /**
   * Deriva contratti da intent snapshot. Se kill-switch OFF → contracts [].
   * Accumula tutti i contratti dei provider (nessuna deduplicazione).
   */
  derive(
    intentSnapshot: IrisActionIntentSnapshot,
    registry: MessagingContractRegistry
  ): IrisMessagingContractSnapshot {
    const derivedAt = new Date().toISOString();
    if (!isMessagingContractEnabled(registry)) {
      return Object.freeze({
        contracts: Object.freeze([]),
        derivedAt,
      });
    }
    const contracts: IrisMessagingContract[] = [];
    for (const provider of this.providers) {
      const out = provider.derive(intentSnapshot);
      if (out != null && out.length > 0) {
        for (const c of out) {
          contracts.push(
            Object.freeze({
              contractId: c.contractId,
              intentId: c.intentId,
              intentType: c.intentType,
              messagePurpose: c.messagePurpose,
              ...(c.payloadSchema != null && { payloadSchema: Object.freeze({ ...c.payloadSchema }) }),
              ...(c.constraints != null && { constraints: Object.freeze({ ...c.constraints }) }),
              derivedAt: c.derivedAt,
            })
          );
        }
      }
    }
    return Object.freeze({
      contracts: Object.freeze(contracts),
      derivedAt,
    });
  }
}
