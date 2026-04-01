/**
 * IrisDeliveryEngine — IRIS 10.1
 * Esegue delivery verso adapter esterni. Nessuna selezione; applica tutti gli adapter compatibili.
 */

import type { IrisRenderResult } from '../rendering';
import type { IrisDeliveryAdapter } from './IrisDeliveryAdapter';
import type { IrisDeliveryOutcome } from './IrisDeliveryOutcome';
import type { IrisDeliveryResult } from './IrisDeliveryResult';
import type { DeliveryRegistry } from './IrisDeliveryKillSwitch';
import { isDeliveryEnabled } from './IrisDeliveryKillSwitch';

export class IrisDeliveryEngine {
  constructor(private readonly adapters: readonly IrisDeliveryAdapter[]) {}

  /**
   * Per ogni renderResult, per ogni renderedContent, applica tutti gli adapter compatibili (channelType).
   * Accumula tutti gli outcome. Nessuna selezione o filtro.
   */
  deliver(
    renderResults: readonly IrisRenderResult[],
    registry: DeliveryRegistry
  ): IrisDeliveryResult {
    if (!isDeliveryEnabled(registry)) {
      return Object.freeze({
        results: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
    }
    const outcomes: IrisDeliveryOutcome[] = [];
    for (const renderResult of renderResults) {
      for (const content of renderResult.renderedContents) {
        const compatible = this.adapters.filter(
          (a) => a.channelType === content.channelType
        );
        for (const adapter of compatible) {
          const outcome = adapter.deliver(content);
          outcomes.push(
            Object.freeze({
              adapterId: outcome.adapterId,
              channelId: outcome.channelId,
              status: outcome.status,
              derivedAt: outcome.derivedAt,
              ...(outcome.metadata != null && { metadata: Object.freeze({ ...outcome.metadata }) }),
            })
          );
        }
      }
    }
    return Object.freeze({
      results: Object.freeze(outcomes),
      derivedAt: new Date().toISOString(),
    });
  }
}
