/**
 * Microstep 9L — Governance Certification Format. Certificate types.
 */

import type { GovernanceAttestation } from '../../attestation/types/attestation_types.js';
import type { GovernanceTrustIndexReport } from '../../trust_index/types/governance_trust_index_types.js';

/** Audit metadata: logs, snapshot version, compliance evidence. Must be JSON-serializable. */
export type AuditMetadata = Readonly<Record<string, unknown>>;

/** Versioning info for certificate and format. */
export interface CertificateVersioningInfo {
  readonly certificate_version: string;
  readonly format_version: string;
  readonly timestamp: string; // ISO 8601 emission time
}

/** Input to build an IRIS Governance Certificate. */
export interface IRISGovernanceCertificateInput {
  readonly attestation: GovernanceAttestation;
  readonly trust_index_report: GovernanceTrustIndexReport;
  readonly safety_proof_hash: string;
  readonly audit_metadata: AuditMetadata;
  readonly versioning: CertificateVersioningInfo;
}

/**
 * IRIS Governance Certificate — standardized, verifiable, hashable format
 * for attestation, trust index, safety proof, and audit metadata.
 * Component hashes and format_version enable third-party verification.
 */
export interface IRISGovernanceCertificate {
  readonly certificate_hash: string;
  readonly attestation: GovernanceAttestation;
  readonly trust_index: number;
  readonly trust_index_hash: string;
  readonly safety_proof_hash: string;
  readonly audit_metadata: AuditMetadata;
  readonly version: string;
  readonly format_version: string;
  readonly timestamp: string;
  readonly signature?: string;
}
