/**
 * EmptyPayloadRule — Payload vuoto {} o senza chiavi rilevanti → IGNORED.
 * Solo marcatura, nessuna rimozione.
 */

import type { QualifiedSignalEvent } from '../QualifiedSignalEvent';
import type { SignalQualityRule } from '../SignalQualityRule';

function isEmptyPayload(payload: Record<string, unknown>): boolean {
  return Object.keys(payload).length === 0;
}

function withQuality(
  e: QualifiedSignalEvent,
  quality: QualifiedSignalEvent['quality']
): QualifiedSignalEvent {
  return Object.freeze({
    ...e,
    quality,
    payload: e.payload,
  });
}

export const emptyPayloadRule: SignalQualityRule = {
  id: 'empty-payload',
  apply(events: readonly QualifiedSignalEvent[]): readonly QualifiedSignalEvent[] {
    return Object.freeze(
      events.map((e) =>
        e.quality === 'RAW' && isEmptyPayload(e.payload)
          ? withQuality(e, 'IGNORED')
          : e
      )
    );
  },
};
