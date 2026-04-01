/**
 * Phase 13XX-G — Trust Ledger. Append-only writer.
 */

import type { LedgerEntry } from './ledger_entry.js';
import type { LedgerStore } from './ledger_storage.js';
import { LedgerHashChain } from './ledger_hash_chain.js';

export class LedgerWriter {
  private readonly hashChain = new LedgerHashChain();

  constructor(private readonly store: LedgerStore) {}

  append(entry: LedgerEntry): void {
    const all = this.store.getAll();
    const last = all.length > 0 ? all[all.length - 1] : null;
    const previous_hash = last?.entry_hash ?? undefined;
    const entryWithPrev: LedgerEntry = Object.freeze({
      ...entry,
      previous_hash,
    });
    const entry_hash = this.hashChain.computeEntryHash(entryWithPrev);
    const full: LedgerEntry = Object.freeze({
      ...entryWithPrev,
      entry_hash,
    });
    this.store.append(full);
  }
}
