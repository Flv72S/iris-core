/**
 * Phase 11G — Global Audit & Verification Layer. Types.
 * All objects are immutable.
 */

export type AuditStatus = 'PASS' | 'WARNING' | 'FAIL';

export interface AuditCheckResult {
  readonly check_name: string;
  readonly status: AuditStatus;
  readonly details?: string;
}

export interface NodeAuditResult {
  readonly node_id: string;
  readonly organization_id: string;
  readonly snapshot_integrity: AuditStatus;
  readonly certificate_integrity: AuditStatus;
  readonly trust_proof_integrity: AuditStatus;
}

export interface GlobalAuditReport {
  readonly total_nodes: number;
  readonly passed_nodes: number;
  readonly warning_nodes: number;
  readonly failed_nodes: number;
  readonly cross_node_consistency: AuditStatus;
  readonly audit_results: readonly NodeAuditResult[];
  readonly audit_timestamp: number;
}
