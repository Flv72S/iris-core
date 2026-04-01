/**
 * Phase 13XX-G — Trust Ledger. Entry shape.
 * 13XX-G-P1: All fields readonly for immutable schema.
 */

import type { LedgerEntryType } from './ledger_types.js';

export interface LedgerEntry {
  readonly entry_id: string;
  readonly node_id: string;
  readonly type: LedgerEntryType;
  readonly timestamp: number;
  readonly data: Readonly<Record<string, unknown>>;
  readonly previous_hash?: string | undefined;
  readonly entry_hash?: string | undefined;
}
