/**
 * Step 8H — Governance Time Machine. Types for historical state reconstruction.
 */

import type { GovernanceLedgerEntry } from '../../ledger/types/ledger_types.js';
import type { GovernanceAttestation } from '../../attestation/types/attestation_types.js';

/** Reconstructed governance state at a point in time (read-only). */
export interface GovernanceStateAtTime {
  readonly timestamp: number;
  readonly entry: GovernanceLedgerEntry;
  readonly attestation?: GovernanceAttestation;
}

/** Optional resolver: attestation_hash → attestation (e.g. from store). */
export type AttestationResolver = (attestationHash: string) => GovernanceAttestation | undefined;
