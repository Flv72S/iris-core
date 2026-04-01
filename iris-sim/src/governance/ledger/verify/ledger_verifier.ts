/**
 * Step 8G — Ledger verifier. Validates chain integrity.
 */

import { createHash } from 'node:crypto';
import type { GovernanceLedger } from '../types/ledger_types.js';

const GENESIS = 'GENESIS';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Verify full ledger: sequential index, previous_hash chain, ledger_hash recomputation.
 */
export function verifyLedger(ledger: GovernanceLedger): boolean {
  const entries = ledger.entries;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    if (entry.index !== i) return false;

    const expectedPrevious = i === 0 ? GENESIS : entries[i - 1]!.ledger_hash;
    if (entry.previous_hash !== expectedPrevious) return false;

    const payload = String(entry.index) + entry.previous_hash + entry.attestation_hash;
    const computedHash = sha256Hex(payload);
    if (entry.ledger_hash !== computedHash) return false;
  }
  return true;
}
