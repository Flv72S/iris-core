/**
 * S-3 — Deterministic temporal evaluation. Bounded sliding window; no unbounded history.
 */

import type { TraceEntry } from '../../trace-engine/TraceTypes.js';
import { TraceWindow } from './TraceWindow.js';

const DELIVERY_PREFIX = 'sim:deliver:';

export function parseDeliveryEventId(eventId: string): { from: string; to: string; type: string; tickSent: string } | null {
  if (!eventId.startsWith(DELIVERY_PREFIX)) return null;
  const rest = eventId.slice(DELIVERY_PREFIX.length);
  const parts = rest.split(':');
  if (parts.length < 5) return null;
  return { from: parts[0], to: parts[1], type: parts[2], tickSent: parts[3] };
}

/** Key unique per delivery event. Same eventId = same delivery (double delivery if seen twice). */
export function deliveryKey(eventId: string): string | null {
  if (!eventId.startsWith(DELIVERY_PREFIX)) return null;
  return eventId;
}

export class DeterministicTemporalEvaluator {
  private readonly _window: TraceWindow;
  private readonly _deliveredKeys: Set<string> = new Set();

  constructor(maxWindowSize: number) {
    this._window = new TraceWindow(maxWindowSize);
  }

  ingest(entries: readonly TraceEntry[]): void {
    for (const e of entries) {
      this._window.append(e);
      const key = deliveryKey(e.eventId);
      if (key) this._deliveredKeys.add(key);
    }
  }

  getEntriesAtTick(tick: bigint): readonly TraceEntry[] {
    return this._window.getEntriesAtTick(String(tick));
  }

  getEntriesUpToTick(tick: bigint): readonly TraceEntry[] {
    return this._window.getEntriesUpToTick(String(tick));
  }

  hasDelivered(key: string): boolean {
    return this._deliveredKeys.has(key);
  }

  get deliveredKeys(): ReadonlySet<string> {
    return this._deliveredKeys;
  }

  reset(): void {
    this._window.clear();
    this._deliveredKeys.clear();
  }
}
