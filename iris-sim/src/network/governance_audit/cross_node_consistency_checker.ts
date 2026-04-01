/**
 * Phase 11G — Cross-Node Consistency Checker.
 * Verifies alignment between trust indices and certificates. Read-only.
 */

import type { NodeTrustIndex } from '../inter_org_trust/types/trust_types.js';
import type { FederatedTrustCertificate } from '../trust_certification/types/trust_certificate_types.js';
import type { AuditStatus } from './audit_types.js';

/**
 * Check cross-node consistency. Deterministic.
 * FAIL: any node has a certificate but no trust index.
 * WARNING: trust index exists but no certificate for that node.
 * PASS: otherwise.
 */
export function checkCrossNodeConsistency(
  trust_indices: readonly NodeTrustIndex[],
  certificates: readonly FederatedTrustCertificate[]
): AuditStatus {
  const indexNodeIds = new Set(trust_indices.map((n) => n.node_id));
  const certNodeIds = new Set(certificates.map((c) => c.node_id));
  for (const nodeId of certNodeIds) {
    if (!indexNodeIds.has(nodeId)) return 'FAIL';
  }
  for (const nodeId of indexNodeIds) {
    if (!certNodeIds.has(nodeId)) return 'WARNING';
  }
  return 'PASS';
}
