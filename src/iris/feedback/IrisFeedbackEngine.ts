/**
 * IrisFeedbackEngine — IRIS 10.2
 * Raccolta passiva di segnali da adapter. Normalizza in eventi; nessun filtro, nessuna interpretazione.
 */

import type { IrisFeedbackAdapter } from './IrisFeedbackAdapter';
import type { IrisFeedbackEvent } from './IrisFeedbackEvent';
import type { IrisFeedbackSignal } from './IrisFeedbackSignal';
import type { IrisFeedbackSnapshot } from './IrisFeedbackSnapshot';
import type { FeedbackRegistry } from './IrisFeedbackKillSwitch';
import { isFeedbackEnabled } from './IrisFeedbackKillSwitch';

export class IrisFeedbackEngine {
  constructor(private readonly adapters: readonly IrisFeedbackAdapter[]) {}

  /**
   * Chiama tutti gli adapter, normalizza ogni segnale in evento. Nessun filtro, nessuna aggregazione.
   */
  collect(registry: FeedbackRegistry): IrisFeedbackSnapshot {
    if (!isFeedbackEnabled(registry)) {
      return Object.freeze({
        events: Object.freeze([]),
        derivedAt: new Date().toISOString(),
      });
    }
    const derivedAt = new Date().toISOString();
    const events: IrisFeedbackEvent[] = [];
    for (const adapter of this.adapters) {
      const signals = adapter.collect();
      for (const signal of signals) {
        const event: IrisFeedbackEvent = Object.freeze({
          eventId: `ev-${adapter.id}-${signal.signalId}`,
          signal: Object.freeze({
            signalId: signal.signalId,
            source: signal.source,
            eventType: signal.eventType,
            ...(signal.deliveryId != null && { deliveryId: signal.deliveryId }),
            occurredAt: signal.occurredAt,
            ...(signal.payload != null && { payload: Object.freeze({ ...signal.payload }) }),
          }),
          derivedAt,
        });
        events.push(event);
      }
    }
    return Object.freeze({
      events: Object.freeze(events),
      derivedAt,
    });
  }
}
