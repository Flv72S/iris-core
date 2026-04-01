/**
 * TimeNoiseRule — TIME_TICK troppo frequenti (distanza < 1s) → primo STABLE, successivi NOISY.
 * Ordine preservato.
 */

import type { QualifiedSignalEvent } from '../QualifiedSignalEvent';
import type { SignalQualityRule } from '../SignalQualityRule';

const MIN_DISTANCE_MS = 1000;

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

export const timeNoiseRule: SignalQualityRule = {
  id: 'time-noise',
  apply(events: readonly QualifiedSignalEvent[]): readonly QualifiedSignalEvent[] {
    const timeEvents = events.filter(
      (e) => e.source === 'time' && e.type === 'TIME_TICK'
    );
    const sorted = [...timeEvents].sort((a, b) => a.occurredAt - b.occurredAt);
    const noisyIds = new Set<string>();
    let lastStableAt = -Infinity;

    for (const e of sorted) {
      if (e.occurredAt - lastStableAt < MIN_DISTANCE_MS) {
        noisyIds.add(e.id);
      } else {
        lastStableAt = e.occurredAt;
      }
    }

    return Object.freeze(
      events.map((e) => {
        if (e.source !== 'time' || e.type !== 'TIME_TICK') return e;
        if (e.quality !== 'RAW' && e.quality !== 'STABLE') return e;
        return withQuality(e, noisyIds.has(e.id) ? 'NOISY' : 'STABLE');
      })
    );
  },
};
