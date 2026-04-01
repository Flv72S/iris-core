import { securityLog } from '../security/security_logger.js';

import type { AuditLog } from './audit_log.js';

export interface AuditSnapshot {
  merkleRoot: string;
  totalRecords: number;
  lastRecordHash: string;
  timestamp: number;
}

/**
 * Deterministic for a fixed audit log: root and hashes depend only on record hashes and order.
 * `timestamp` is the last record's timestamp, or `0` if empty.
 */
export function createAuditSnapshot(log: AuditLog): AuditSnapshot {
  const all = log.getAll();
  const last = all.length > 0 ? all[all.length - 1]! : null;
  return {
    merkleRoot: log.getMerkleRoot(),
    totalRecords: all.length,
    lastRecordHash: last?.recordHash ?? '',
    timestamp: last != null ? last.timestamp : 0,
  };
}

export function verifyAuditSnapshotMatchesLog(snapshot: AuditSnapshot, log: AuditLog): boolean {
  const actual = log.getMerkleRoot();
  if (snapshot.merkleRoot !== actual) {
    securityLog('MERKLE_ROOT_MISMATCH', { expected: snapshot.merkleRoot, actual });
    return false;
  }
  return true;
}
