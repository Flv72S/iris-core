/**
 * Step 8M — Global Governance Snapshot exporter.
 */

import type {
  GlobalGovernanceSnapshot,
  GlobalSnapshotAuditRecord,
} from '../types/global_snapshot_types.js';

export function exportGlobalSnapshotJSON(snapshot: GlobalGovernanceSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function exportGlobalSnapshotAuditRecord(
  snapshot: GlobalGovernanceSnapshot
): GlobalSnapshotAuditRecord {
  return Object.freeze({
    snapshot_id: snapshot.snapshot_id,
    timestamp: snapshot.timestamp,
    tier: snapshot.governance_tier,
    certificate: snapshot.certificate_hash,
    ledger_head: snapshot.ledger_head_hash,
    global_hash: snapshot.global_hash,
  });
}
