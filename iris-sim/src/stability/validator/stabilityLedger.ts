/**
 * Stability Step 3 — Stability ledger.
 * Entries per window, cumulative impact, approved ratio. Window reset by windowSizeMs.
 */

import type { StabilityLedgerEntry, StabilityBudgetConfig } from './stabilityBudgetTypes.js';

export class StabilityLedger {
  private readonly _entries: StabilityLedgerEntry[] = [];
  private _windowStartTimestamp: number = 0;
  private _cumulativeImpact: number = 0;
  private readonly _windowSizeMs: number;

  constructor(config: StabilityBudgetConfig) {
    this._windowSizeMs = config.windowSizeMs;
    this._windowStartTimestamp = Date.now();
  }

  get entries(): readonly StabilityLedgerEntry[] {
    return this._entries;
  }

  get windowStartTimestamp(): number {
    return this._windowStartTimestamp;
  }

  addEntry(entry: StabilityLedgerEntry): void {
    this.resetWindowIfNeeded();
    this._entries.push(entry);
    this._cumulativeImpact += entry.impactScore;
  }

  resetWindowIfNeeded(nowMs: number = Date.now()): void {
    if (nowMs - this._windowStartTimestamp >= this._windowSizeMs) {
      this._windowStartTimestamp = nowMs;
      this._entries.length = 0;
      this._cumulativeImpact = 0;
    }
  }

  getCumulativeImpact(nowMs: number = Date.now()): number {
    this.resetWindowIfNeeded(nowMs);
    return this._cumulativeImpact;
  }

  getEntries(): readonly StabilityLedgerEntry[] {
    return this._entries;
  }

  getApprovedRatio(): number {
    if (this._entries.length === 0) return 1;
    const approved = this._entries.filter((e) => e.approved).length;
    return approved / this._entries.length;
  }
}
