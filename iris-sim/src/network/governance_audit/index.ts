/**
 * Phase 11G — Global Audit & Verification Layer.
 */

export type {
  AuditStatus,
  AuditCheckResult,
  NodeAuditResult,
  GlobalAuditReport,
} from './audit_types.js';
export { verifySnapshotIntegrity } from './snapshot_integrity_verifier.js';
export { verifyCertificateIntegrity, type TrustCertificateForAudit } from './certificate_integrity_verifier.js';
export { verifyTrustProof } from './trust_proof_verifier.js';
export { verifyFederatedTrustReportIntegrity } from './trust_report_verifier.js';
export { checkCrossNodeConsistency } from './cross_node_consistency_checker.js';
export { runGlobalGovernanceAudit } from './global_audit_engine.js';
