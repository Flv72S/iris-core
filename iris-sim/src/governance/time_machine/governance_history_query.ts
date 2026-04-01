/**
 * Step 8H — Governance History Query. Read-only queries over ledger (audit, forensics).
 */

import type { GovernanceLedger, GovernanceLedgerEntry } from '../ledger/types/ledger_types.js';

/**
 * Get ledger entries in [startTime, endTime] (inclusive).
 */
export function getHistory(
  ledger: GovernanceLedger,
  startTime: number,
  endTime: number
): readonly GovernanceLedgerEntry[] {
  return ledger.entries.filter(
    (e) => e.timestamp >= startTime && e.timestamp <= endTime
  );
}

/**
 * Get entries by event type. Ledger entries are attestation appends; type "attestation" matches all.
 */
export function getEventsByType(
  ledger: GovernanceLedger,
  type: string
): readonly GovernanceLedgerEntry[] {
  if (type === 'attestation' || type === 'GovernanceLedgerEntry') {
    return ledger.entries;
  }
  return [];
}

/**
 * Get entries by actor. Current ledger entries do not store actorId; returns empty.
 */
export function getEventsByActor(
  _ledger: GovernanceLedger,
  _actorId: string
): readonly GovernanceLedgerEntry[] {
  return [];
}
