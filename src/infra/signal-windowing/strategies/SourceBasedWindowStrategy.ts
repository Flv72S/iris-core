/**
 * SourceBasedWindowStrategy — Raggruppa per source + bucket temporale (es. 2 min).
 * Finestre parallele per (source, bucket). IGNORED esclusi.
 */

import type { QualifiedSignalEvent } from '../../signal-quality/QualifiedSignalEvent';
import type { SignalWindow } from '../SignalWindow';
import type { SignalWindowingStrategy } from '../SignalWindowingStrategy';

const BUCKET_MS = 2 * 60 * 1000;

function isIncluded(e: QualifiedSignalEvent): boolean {
  return e.quality !== 'IGNORED';
}

export const sourceBasedWindowStrategy: SignalWindowingStrategy = {
  id: 'source-based-window',
  build(
    events: readonly QualifiedSignalEvent[],
    now: number
  ): readonly SignalWindow[] {
    const byKey = new Map<string, { start: number; evts: QualifiedSignalEvent[] }>();
    for (const e of events) {
      if (!isIncluded(e)) continue;
      const bucketStart =
        Math.floor(e.occurredAt / BUCKET_MS) * BUCKET_MS;
      const key = `${e.source}:${bucketStart}`;
      if (!byKey.has(key)) byKey.set(key, { start: bucketStart, evts: [] });
      byKey.get(key)!.evts.push(e);
    }
    const windows: SignalWindow[] = [];
    for (const [key, { start: bucketStart, evts }] of byKey) {
      windows.push(
        Object.freeze({
          windowId: `source-${key.replace(':', '-')}`,
          startAt: bucketStart,
          endAt: bucketStart + BUCKET_MS,
          events: Object.freeze(evts),
          createdAt: now,
        })
      );
    }
    return Object.freeze(windows);
  },
};
