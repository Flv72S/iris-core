/**
 * Phase 13XX-G — Trust Ledger. In-memory storage (replaceable).
 */

import type { LedgerEntry } from './ledger_entry.js';

export interface LedgerStore {
  append(entry: LedgerEntry): void;
  getAll(): readonly LedgerEntry[];
}

export class InMemoryLedgerStore implements LedgerStore {
  private readonly entries: LedgerEntry[] = [];

  append(entry: LedgerEntry): void {
    this.entries.push(entry);
  }

  getAll(): readonly LedgerEntry[] {
    return this.entries;
  }
}
