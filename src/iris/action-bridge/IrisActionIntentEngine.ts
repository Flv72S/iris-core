/**
 * IrisActionIntentEngine — IRIS 12.0
 * Deriva Action Intents da Selection Snapshot. Kill-switch OFF → intents [].
 * Nessuna deduplicazione, nessuna validazione semantica. Output frozen.
 */

import type { IrisDecisionSelectionSnapshot } from '../decision';
import type { IrisActionIntentProvider } from './IrisActionIntentProvider';
import type { IrisActionIntent } from './IrisActionIntent';
import type { IrisActionIntentSnapshot } from './IrisActionIntentSnapshot';
import type { ActionBridgeRegistry } from './IrisActionBridgeKillSwitch';
import { isActionBridgeEnabled } from './IrisActionBridgeKillSwitch';

export class IrisActionIntentEngine {
  constructor(private readonly providers: readonly IrisActionIntentProvider[]) {}

  /**
   * Deriva intent da selection. Se kill-switch OFF → intents [].
   * Accumula tutti gli intent dei provider (nessuna deduplicazione).
   */
  derive(
    selectionSnapshot: IrisDecisionSelectionSnapshot,
    registry: ActionBridgeRegistry
  ): IrisActionIntentSnapshot {
    const derivedAt = new Date().toISOString();
    if (!isActionBridgeEnabled(registry)) {
      return Object.freeze({
        intents: Object.freeze([]),
        derivedAt,
      });
    }
    const intents: IrisActionIntent[] = [];
    for (const provider of this.providers) {
      const out = provider.derive(selectionSnapshot);
      if (out != null && out.length > 0) {
        for (const intent of out) {
          intents.push(
            Object.freeze({
              intentId: intent.intentId,
              selectionId: intent.selectionId,
              intentType: intent.intentType,
              description: intent.description,
              ...(intent.constraints != null && { constraints: Object.freeze({ ...intent.constraints }) }),
              ...(intent.metadata != null && { metadata: Object.freeze({ ...intent.metadata }) }),
              derivedAt: intent.derivedAt,
            })
          );
        }
      }
    }
    return Object.freeze({
      intents: Object.freeze(intents),
      derivedAt,
    });
  }
}
