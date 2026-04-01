/**
 * SlidingWindowStrategy — Finestra mobile (ultimi 10 min), una sola finestra.
 * Eventi con occurredAt >= now - windowSize, esclusi IGNORED.
 */

import type { QualifiedSignalEvent } from '../../signal-quality/QualifiedSignalEvent';
import type { SignalWindow } from '../SignalWindow';
import type { SignalWindowingStrategy } from '../SignalWindowingStrategy';

const WINDOW_MS = 10 * 60 * 1000;

function isIncluded(e: QualifiedSignalEvent): boolean {
  return e.quality !== 'IGNORED';
}

export const slidingWindowStrategy: SignalWindowingStrategy = {
  id: 'sliding-window',
  build(
    events: readonly QualifiedSignalEvent[],
    now: number
  ): readonly SignalWindow[] {
    const startAt = now - WINDOW_MS;
    const evts = events.filter(
      (e) => isIncluded(e) && e.occurredAt >= startAt
    );
    if (evts.length === 0) return Object.freeze([]);
    const window: SignalWindow = Object.freeze({
      windowId: `sliding-${startAt}`,
      startAt,
      endAt: now,
      events: Object.freeze(evts),
      createdAt: now,
    });
    return Object.freeze([window]);
  },
};
