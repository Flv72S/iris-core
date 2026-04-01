/**
 * Step 8K — External ledger verifier. Reuses Step 8G verifyLedger for hash chain integrity.
 */

import type { GovernanceLedger } from '../../ledger/types/ledger_types.js';
import { verifyLedger } from '../../ledger/verify/ledger_verifier.js';
import type { VerificationResult } from '../types/verifier_types.js';

/**
 * Verify ledger integrity (hash chain, sequential index, previous_hash). Reuses Step 8G.
 */
export function verifyLedgerIntegrity(ledger: GovernanceLedger): VerificationResult {
  const ok = verifyLedger(ledger);
  if (ok) return Object.freeze({ valid: true });
  return Object.freeze({ valid: false, reason: 'ledger_chain_invalid' });
}
