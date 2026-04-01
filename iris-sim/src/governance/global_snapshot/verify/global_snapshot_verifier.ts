/**
 * Step 8M — Global Governance Snapshot verifier.
 */

import { computeGlobalSnapshotHash } from '../hashing/global_snapshot_hash.js';
import type { GlobalGovernanceSnapshot } from '../types/global_snapshot_types.js';

export function verifyGlobalSnapshot(snapshot: GlobalGovernanceSnapshot): boolean {
  const recomputedHash = computeGlobalSnapshotHash(snapshot);
  return recomputedHash === snapshot.global_hash;
}
