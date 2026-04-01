/**
 * FixedTimeWindowStrategy — Finestra fissa (es. 5 min), raggruppa per occurredAt.
 * Eventi IGNORED non entrano in nessuna finestra.
 */

import type { QualifiedSignalEvent } from '../../signal-quality/QualifiedSignalEvent';
import type { SignalWindow } from '../SignalWindow';
import type { SignalWindowingStrategy } from '../SignalWindowingStrategy';

const WINDOW_MS = 5 * 60 * 1000;

function isIncluded(e: QualifiedSignalEvent): boolean {
  return e.quality !== 'IGNORED';
}

export const fixedTimeWindowStrategy: SignalWindowingStrategy = {
  id: 'fixed-time-window',
  build(
    events: readonly QualifiedSignalEvent[],
    now: number
  ): readonly SignalWindow[] {
    const byBucket = new Map<number, QualifiedSignalEvent[]>();
    for (const e of events) {
      if (!isIncluded(e)) continue;
      const bucketStart = Math.floor(e.occurredAt / WINDOW_MS) * WINDOW_MS;
      if (!byBucket.has(bucketStart)) byBucket.set(bucketStart, []);
      byBucket.get(bucketStart)!.push(e);
    }
    const windows: SignalWindow[] = [];
    for (const [startAt, evts] of byBucket) {
      windows.push(
        Object.freeze({
          windowId: `fixed-${startAt}`,
          startAt,
          endAt: startAt + WINDOW_MS,
          events: Object.freeze(evts),
          createdAt: now,
        })
      );
    }
    return Object.freeze(windows);
  },
};
