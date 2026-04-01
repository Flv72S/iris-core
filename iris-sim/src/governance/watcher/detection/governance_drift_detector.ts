/**
 * Step 8L — Governance drift detector. Current snapshot hash differs from certified.
 */

import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import { createGovernanceAlert } from '../types/governance_alert.js';
import type { GovernanceAlert } from '../types/governance_alert.js';

/**
 * If current snapshot hash !== certified_snapshot_hash, generate GOVERNANCE_DRIFT alert.
 */
export function detectGovernanceDrift(
  currentSnapshot: GovernanceTierSnapshot,
  certifiedSnapshotHash: string
): GovernanceAlert[] {
  const currentHash = hashObjectDeterministic(currentSnapshot);
  if (currentHash !== certifiedSnapshotHash) {
    return [
      createGovernanceAlert(
        'GOVERNANCE_DRIFT',
        'CRITICAL',
        'Current governance snapshot hash does not match certified hash',
        certifiedSnapshotHash
      ),
    ];
  }
  return [];
}
