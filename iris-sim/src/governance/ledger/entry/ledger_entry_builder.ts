/**
 * Step 8G — Ledger entry builder. Links attestation to previous entry.
 */

import { createHash } from 'node:crypto';
import type { GovernanceAttestation } from '../../attestation/types/attestation_types.js';
import type { GovernanceLedgerEntry } from '../types/ledger_types.js';

const GENESIS = 'GENESIS';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Build a ledger entry from attestation and optional previous entry.
 */
export function buildLedgerEntry(
  attestation: GovernanceAttestation,
  previousEntry?: GovernanceLedgerEntry
): GovernanceLedgerEntry {
  const index = previousEntry !== undefined ? previousEntry.index + 1 : 0;
  const previous_hash = previousEntry !== undefined ? previousEntry.ledger_hash : GENESIS;
  const attestation_hash = attestation.attestation_hash;

  const payload = String(index) + previous_hash + attestation_hash;
  const ledger_hash = sha256Hex(payload);
  const timestamp = Date.now();

  return Object.freeze({
    index,
    previous_hash,
    attestation_hash,
    ledger_hash,
    timestamp,
  });
}
