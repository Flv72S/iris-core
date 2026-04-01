/**
 * Step 8G — Governance Ledger. Ledger entry and chain types.
 */

export interface GovernanceLedgerEntry {
  readonly index: number;
  readonly previous_hash: string;
  readonly attestation_hash: string;
  readonly ledger_hash: string;
  readonly timestamp: number;
}

export interface GovernanceLedger {
  entries: GovernanceLedgerEntry[];
}
