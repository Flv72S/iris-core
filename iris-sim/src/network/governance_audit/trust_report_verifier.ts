/**
 * Phase 11G — Trust Report Verifier.
 * Verifies federated trust report hash and consistency. Read-only.
 */

import type { FederatedTrustReport } from '../inter_org_trust/types/trust_types.js';
import { verifyFederatedTrustReport } from '../inter_org_trust/report/federated_trust_report_builder.js';
import type { AuditStatus } from './audit_types.js';

/**
 * Verify federated trust report. Deterministic.
 * FAIL: report hash mismatch.
 * WARNING: inconsistent node count (trust_proof.evaluated_nodes length !== node_trust_indices length).
 * PASS: otherwise.
 */
export function verifyFederatedTrustReportIntegrity(report: FederatedTrustReport): AuditStatus {
  const hashValid = verifyFederatedTrustReport(report);
  if (!hashValid) return 'FAIL';
  const proofNodeCount = report.trust_proof.evaluated_nodes.length;
  const indexCount = report.node_trust_indices.length;
  if (proofNodeCount !== indexCount) return 'WARNING';
  return 'PASS';
}
