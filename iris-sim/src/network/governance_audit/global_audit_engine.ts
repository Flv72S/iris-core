/**
 * Phase 11G — Global Audit Engine.
 * Orchestrates read-only verification of trust snapshots, certificates, proof, report, and cross-node consistency.
 */

import type { NodeTrustIndex } from '../inter_org_trust/types/trust_types.js';
import type { FederatedTrustReport } from '../inter_org_trust/types/trust_types.js';
import type { TrustProof } from '../inter_org_trust/types/trust_types.js';
import type { NodeAuditResult, GlobalAuditReport, AuditStatus } from './audit_types.js';
import { verifySnapshotIntegrity } from './snapshot_integrity_verifier.js';
import { verifyCertificateIntegrity, type TrustCertificateForAudit } from './certificate_integrity_verifier.js';
import { verifyTrustProof } from './trust_proof_verifier.js';
import { checkCrossNodeConsistency } from './cross_node_consistency_checker.js';

function nodeStatus(snapshot: AuditStatus, cert: AuditStatus, proof: AuditStatus): AuditStatus {
  if (snapshot === 'FAIL' || cert === 'FAIL' || proof === 'FAIL') return 'FAIL';
  if (snapshot === 'WARNING' || cert === 'WARNING' || proof === 'WARNING') return 'WARNING';
  return 'PASS';
}

/**
 * Run global governance audit. Read-only, deterministic.
 */
export function runGlobalGovernanceAudit(
  trust_indices: readonly NodeTrustIndex[],
  certificates: readonly TrustCertificateForAudit[],
  proofs: readonly TrustProof[],
  report: FederatedTrustReport,
  timestamp: number
): GlobalAuditReport {
  const proofToUse = proofs.length > 0 ? proofs[0]! : report.trust_proof;
  const trust_proof_status = verifyTrustProof(
    proofToUse,
    report.node_trust_indices,
    report.attestation_results
  );

  const indexByNode = new Map<string, NodeTrustIndex>();
  for (const t of trust_indices) indexByNode.set(t.node_id, t);
  const certByNode = new Map<string, TrustCertificateForAudit>();
  for (const c of certificates) certByNode.set(c.node_id, c);

  const allNodeIds = new Set<string>([...indexByNode.keys(), ...certByNode.keys()]);
  const sortedNodeIds = [...allNodeIds].sort((a, b) => a.localeCompare(b));

  const audit_results: NodeAuditResult[] = [];
  for (const node_id of sortedNodeIds) {
    const ti = indexByNode.get(node_id);
    const cert = certByNode.get(node_id);
    const snapshot_status: AuditStatus = ti
      ? verifySnapshotIntegrity([ti])
      : 'FAIL';
    const cert_status: AuditStatus = cert
      ? verifyCertificateIntegrity(cert)
      : 'WARNING';
    const organization_id = ti?.organization_id ?? cert?.organization_id ?? '';
    audit_results.push(
      Object.freeze({
        node_id,
        organization_id,
        snapshot_integrity: snapshot_status,
        certificate_integrity: cert_status,
        trust_proof_integrity: trust_proof_status,
      })
    );
  }

  const passed_nodes = audit_results.filter((r) => nodeStatus(r.snapshot_integrity, r.certificate_integrity, r.trust_proof_integrity) === 'PASS').length;
  const failed_nodes = audit_results.filter((r) => nodeStatus(r.snapshot_integrity, r.certificate_integrity, r.trust_proof_integrity) === 'FAIL').length;
  const warning_nodes = audit_results.length - passed_nodes - failed_nodes;

  const cross_node_consistency = checkCrossNodeConsistency(trust_indices, certificates);

  return Object.freeze({
    total_nodes: audit_results.length,
    passed_nodes,
    warning_nodes,
    failed_nodes,
    cross_node_consistency,
    audit_results,
    audit_timestamp: timestamp,
  });
}
