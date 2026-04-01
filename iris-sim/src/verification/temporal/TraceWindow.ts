/**
 * S-3 — Bounded trace window.
 */

import type { TraceEntry } from '../../trace-engine/TraceTypes.js';

export class TraceWindow {
  private readonly _maxSize: number;
  private readonly _entries: TraceEntry[] = [];

  constructor(maxSize: number) {
    this._maxSize = Math.max(1, maxSize);
  }

  append(entry: TraceEntry): void {
    this._entries.push(entry);
    if (this._entries.length > this._maxSize) this._entries.shift();
  }

  getEntriesAtTick(tick: string): readonly TraceEntry[] {
    return this._entries.filter((e) => e.tick === tick);
  }

  getEntriesUpToTick(tick: string): readonly TraceEntry[] {
    return this._entries.filter((e) => BigInt(e.tick) <= BigInt(tick));
  }

  get allEntries(): readonly TraceEntry[] {
    return this._entries;
  }

  clear(): void {
    this._entries.length = 0;
  }
}
