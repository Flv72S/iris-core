/**
 * Step 8N — Governance Diff Engine. Hashing.
 */

import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import type { GovernanceComponentChange } from '../types/governance_diff_types.js';

export function computeGovernanceDiffHash(
  snapshotAHash: string,
  snapshotBHash: string,
  changes: readonly GovernanceComponentChange[]
): string {
  return hashObjectDeterministic({
    snapshotAHash,
    snapshotBHash,
    changes,
  });
}
