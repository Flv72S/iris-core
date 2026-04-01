/**
 * S-0 — Execution trace. Ordered entries, export/import, hashable.
 */

import type { TraceEntry, TraceExport } from './TraceTypes.js';
import { TraceHasher } from './TraceHasher.js';

export class ExecutionTrace {
  private readonly _entries: TraceEntry[] = [];
  private _hash: string | null = null;
  private _dirty = true;

  append(entry: TraceEntry): void {
    this._entries.push(Object.freeze({ ...entry }));
    this._dirty = true;
  }

  get entries(): readonly TraceEntry[] {
    return this._entries;
  }

  computeHash(): string {
    if (!this._dirty && this._hash !== null) return this._hash;
    this._hash = TraceHasher.hashEntries(this._entries);
    this._dirty = false;
    return this._hash;
  }

  export(): TraceExport {
    const hash = this._dirty ? TraceHasher.hashEntries(this._entries) : this._hash!;
    this._hash = hash;
    this._dirty = false;
    return Object.freeze({
      entries: [...this._entries],
      executionHash: hash,
    });
  }

  import(data: TraceExport): void {
    this._entries.length = 0;
    this._entries.push(...data.entries.map((e) => Object.freeze({ ...e })));
    this._hash = data.executionHash;
    this._dirty = false;
  }

  clear(): void {
    this._entries.length = 0;
    this._hash = null;
    this._dirty = true;
  }
}
