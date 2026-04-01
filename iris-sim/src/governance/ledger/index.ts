/**
 * Step 8G — Governance Ledger. Tamper-evident chain of attestations.
 */

export type { GovernanceLedger, GovernanceLedgerEntry } from './types/ledger_types.js';
export { buildLedgerEntry } from './entry/ledger_entry_builder.js';
export {
  createLedger,
  appendAttestation,
  getLatestEntry,
  getLedgerSize,
} from './chain/ledger_chain.js';
export { verifyLedger } from './verify/ledger_verifier.js';
