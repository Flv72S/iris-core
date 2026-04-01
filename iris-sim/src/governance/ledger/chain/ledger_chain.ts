/**
 * Step 8G — Ledger chain manager. In-memory tamper-evident chain.
 */

import type { GovernanceAttestation } from '../../attestation/types/attestation_types.js';
import type { GovernanceLedger, GovernanceLedgerEntry } from '../types/ledger_types.js';
import { buildLedgerEntry } from '../entry/ledger_entry_builder.js';

/**
 * Create an empty ledger.
 */
export function createLedger(): GovernanceLedger {
  return { entries: [] };
}

/**
 * Append attestation to ledger; returns the new entry.
 */
export function appendAttestation(
  ledger: GovernanceLedger,
  attestation: GovernanceAttestation
): GovernanceLedgerEntry {
  const previousEntry = getLatestEntry(ledger);
  const entry = buildLedgerEntry(attestation, previousEntry);
  ledger.entries.push(entry);
  return entry;
}

/**
 * Get the latest ledger entry, or undefined if empty.
 */
export function getLatestEntry(ledger: GovernanceLedger): GovernanceLedgerEntry | undefined {
  const len = ledger.entries.length;
  return len === 0 ? undefined : ledger.entries[len - 1];
}

/**
 * Get the number of entries in the ledger.
 */
export function getLedgerSize(ledger: GovernanceLedger): number {
  return ledger.entries.length;
}
