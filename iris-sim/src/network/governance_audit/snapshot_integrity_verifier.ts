/**
 * Phase 11G — Snapshot Integrity Verifier.
 * Read-only verification of trust index bounds and trust level presence.
 */

import type { NodeTrustIndex } from '../inter_org_trust/types/trust_types.js';
import type { AuditStatus } from './audit_types.js';

const VALID_LEVELS: readonly string[] = ['HIGH', 'MEDIUM', 'LOW', 'UNTRUSTED'];

/**
 * Verify snapshot integrity for a set of trust indices. Deterministic.
 * FAIL: any trust_index < 0 or > 1.
 * WARNING: any node with missing trust level.
 * PASS: otherwise.
 */
export function verifySnapshotIntegrity(trust_indices: readonly NodeTrustIndex[]): AuditStatus {
  for (const n of trust_indices) {
    if (n.trust_index < 0 || n.trust_index > 1) return 'FAIL';
    if (!n.trust_level || !VALID_LEVELS.includes(n.trust_level)) return 'WARNING';
  }
  return 'PASS';
}
