/**
 * Step 8H — Governance Time Machine. Reconstruct state at any timestamp (read-only).
 */

import type { GovernanceLedger, GovernanceLedgerEntry } from '../ledger/types/ledger_types.js';
import type { GovernanceStateAtTime, AttestationResolver } from './types/time_machine_types.js';

/**
 * Find the closest ledger entry at or before the given timestamp (nearest snapshot before target).
 */
export function findClosestSnapshot(
  ledger: GovernanceLedger,
  targetTimestamp: number
): GovernanceLedgerEntry | undefined {
  const entries = ledger.entries;
  let best: GovernanceLedgerEntry | undefined;
  for (const entry of entries) {
    if (entry.timestamp <= targetTimestamp) {
      if (!best || entry.timestamp >= best.timestamp) {
        best = entry;
      }
    }
  }
  return best;
}

/**
 * Reconstruct governance state at targetTimestamp. Uses closest snapshot before target.
 * If attestationResolver is provided and the closest entry has an attestation in the store,
 * the returned state includes the attestation.
 */
export function getStateAt(
  ledger: GovernanceLedger,
  targetTimestamp: number,
  attestationResolver?: AttestationResolver
): GovernanceStateAtTime | undefined {
  const entry = findClosestSnapshot(ledger, targetTimestamp);
  if (!entry) return undefined;

  const attestation =
    attestationResolver !== undefined
      ? attestationResolver(entry.attestation_hash)
      : undefined;

  return Object.freeze({
    timestamp: entry.timestamp,
    entry,
    ...(attestation !== undefined && { attestation }),
  });
}
