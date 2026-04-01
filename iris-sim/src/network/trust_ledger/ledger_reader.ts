/**
 * Phase 13XX-G — Trust Ledger. Read-only reader.
 */

import type { LedgerEntry } from './ledger_entry.js';
import type { LedgerEntryType } from './ledger_types.js';
import type { LedgerStore } from './ledger_storage.js';
import { LedgerHashChain } from './ledger_hash_chain.js';
import { LedgerError, LedgerErrorCode } from './ledger_errors.js';

export class LedgerReader {
  private readonly hashChain = new LedgerHashChain();

  constructor(private readonly store: LedgerStore) {}

  getEntriesForNode(node_id: string): LedgerEntry[] {
    return this.store.getAll().filter((e) => e.node_id === node_id);
  }

  getEntriesByType(type: LedgerEntryType): LedgerEntry[] {
    return this.store.getAll().filter((e) => e.type === type);
  }

  getEntry(entry_id: string): LedgerEntry | null {
    const found = this.store.getAll().find((e) => e.entry_id === entry_id);
    return found ?? null;
  }

  /** Verify hash chain; throw LedgerError if corruption detected. */
  verifyIntegrity(): boolean {
    const all = this.store.getAll();
    let prevHash: string | undefined;
    for (let i = 0; i < all.length; i++) {
      const entry = all[i];
      if (entry.previous_hash !== prevHash) {
        throw new LedgerError(
          `Ledger corruption: entry ${i} previous_hash mismatch`,
          LedgerErrorCode.CORRUPTION_DETECTED
        );
      }
      const expectedHash = this.hashChain.computeEntryHash(entry);
      if (entry.entry_hash !== expectedHash) {
        throw new LedgerError(
          `Ledger corruption: entry ${i} hash mismatch`,
          LedgerErrorCode.CORRUPTION_DETECTED
        );
      }
      prevHash = entry.entry_hash;
    }
    return true;
  }
}
