/**
 * Microstep 9L — Governance Certification Format. Deterministic hashing.
 */

import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import type { AuditMetadata, CertificateVersioningInfo } from '../types/certificate_types.js';

/**
 * Compute audit_metadata_hash from audit metadata object.
 */
export function computeAuditMetadataHash(audit_metadata: AuditMetadata): string {
  return hashObjectDeterministic(audit_metadata);
}

/**
 * Compute versioning_hash from versioning info.
 */
export function computeVersioningHash(versioning: CertificateVersioningInfo): string {
  return hashObjectDeterministic(versioning);
}

/**
 * Compute certificate_hash from the five component hashes (deterministic).
 */
export function computeCertificateHash(components: {
  readonly attestation_hash: string;
  readonly trust_index_hash: string;
  readonly safety_proof_hash: string;
  readonly audit_metadata_hash: string;
  readonly versioning_hash: string;
}): string {
  return hashObjectDeterministic(components);
}

