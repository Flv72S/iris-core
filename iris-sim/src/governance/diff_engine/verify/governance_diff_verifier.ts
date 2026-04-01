/**
 * Step 8N — Governance Diff Engine. Verifier.
 */

import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import type { GlobalGovernanceSnapshot } from '../../global_snapshot/types/global_snapshot_types.js';
import { computeGovernanceDiff } from '../engine/governance_diff_engine.js';
import type { GovernanceDiffReport } from '../types/governance_diff_types.js';

export function verifyGovernanceDiff(
  diff: GovernanceDiffReport,
  snapshotA: GlobalGovernanceSnapshot,
  snapshotB: GlobalGovernanceSnapshot
): boolean {
  const expected = computeGovernanceDiff(snapshotA, snapshotB);
  return (
    diff.snapshot_A_hash === expected.snapshot_A_hash &&
    diff.snapshot_B_hash === expected.snapshot_B_hash &&
    hashObjectDeterministic(diff.changed_components) ===
      hashObjectDeterministic(expected.changed_components) &&
    diff.diff_hash === expected.diff_hash
  );
}
