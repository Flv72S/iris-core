/**
 * MessagingContractEngine — Microstep C.1
 * Interprete: IrisActionIntentSnapshot → MessagingContractSnapshot.
 * Deterministico, side-effect free, nessuna validazione operativa. Kill-switch OFF → snapshot vuoto.
 */

import type { IrisActionIntentSnapshot } from '../../iris/action-bridge';
import type { MessagingContract } from './MessagingContract';
import type { MessagingContractSnapshot } from './MessagingContractSnapshot';
import type { MessagingContractRegistry } from './MessagingContractKillSwitch';
import { isMessagingContractEnabled } from './MessagingContractKillSwitch';

export class MessagingContractEngine {
  /**
   * Interpreta intent snapshot in contract snapshot. Stesso input → stesso output (deterministico).
   */
  interpret(
    intentSnapshot: IrisActionIntentSnapshot,
    registry: MessagingContractRegistry
  ): MessagingContractSnapshot {
    const derivedAt = intentSnapshot.derivedAt;
    if (!isMessagingContractEnabled(registry)) {
      return Object.freeze({
        contracts: Object.freeze([]),
        derivedAt,
      });
    }
    const contracts: MessagingContract[] = [];
    for (const intent of intentSnapshot.intents) {
      contracts.push(
        Object.freeze({
          contractId: `c-${intent.intentId}`,
          intentId: intent.intentId,
          messageKind: intent.intentType,
          payloadDescriptor:
            intent.metadata != null ? Object.freeze({ ...intent.metadata }) : undefined,
          constraints:
            intent.constraints != null ? Object.freeze({ ...intent.constraints }) : undefined,
          metadata: intent.metadata != null ? Object.freeze({ ...intent.metadata }) : undefined,
          derivedAt: intent.derivedAt,
        })
      );
    }
    return Object.freeze({
      contracts: Object.freeze(contracts),
      derivedAt,
    });
  }
}
