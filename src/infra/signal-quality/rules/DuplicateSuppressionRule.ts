/**
 * DuplicateSuppressionRule — Stesso source, type, payload shallow-equal, occurredAt entro N ms.
 * Primo → STABLE, altri → DUPLICATE. Ordine originale preservato.
 */

import type { QualifiedSignalEvent } from '../QualifiedSignalEvent';
import type { SignalQualityRule } from '../SignalQualityRule';

const WINDOW_MS = 5000;

function shallowPayloadKey(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload).sort();
  const parts = keys.map((k) => `${k}:${JSON.stringify(payload[k])}`);
  return parts.join('|');
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

export const duplicateSuppressionRule: SignalQualityRule = {
  id: 'duplicate-suppression',
  apply(events: readonly QualifiedSignalEvent[]): readonly QualifiedSignalEvent[] {
    const result: QualifiedSignalEvent[] = [];
    const firstOccurrence = new Map<string, number>();

    for (const e of events) {
      if (e.quality !== 'RAW') {
        result.push(e);
        continue;
      }
      const key = `${e.source}:${e.type}:${shallowPayloadKey(e.payload)}`;
      const firstAt = firstOccurrence.get(key);
      const isDuplicate =
        firstAt != null && e.occurredAt - firstAt <= WINDOW_MS;
      const quality: QualifiedSignalEvent['quality'] = isDuplicate
        ? 'DUPLICATE'
        : 'STABLE';
      if (!isDuplicate) firstOccurrence.set(key, e.occurredAt);
      result.push(withQuality(e, quality));
    }

    return Object.freeze(result);
  },
};
