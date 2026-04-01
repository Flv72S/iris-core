/**
 * Step 8M — Global Governance Snapshot. Hashing helpers.
 */

import { createHash } from 'node:crypto';
import type { GlobalSnapshotHashFields } from '../types/global_snapshot_types.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export function computeGlobalSnapshotHash(fields: GlobalSnapshotHashFields): string {
  return sha256Hex(
    fields.governance_snapshot_hash +
      fields.policy_enforcement_hash +
      fields.adaptation_hash +
      fields.runtime_state_hash +
      fields.governance_proof_hash +
      fields.attestation_hash +
      fields.ledger_head_hash +
      fields.certificate_hash +
      fields.watcher_state_hash
  );
}
