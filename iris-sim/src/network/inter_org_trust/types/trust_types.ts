/**
 * Phase 11D — Inter-Organizational Trust Layer. Types.
 * All outputs are immutable and deterministic.
 */

/** Trust level derived from trust_index thresholds (Phase 11D.1). */
export type TrustLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNTRUSTED';

/**
 * Per-node trust index (Phase 11D.1 multi-component model).
 * trust_index = 0.5*declared + 0.3*observed + 0.2*verified, normalized in [0, 1].
 */
export interface NodeTrustIndex {
  readonly node_id: string;
  readonly organization_id: string;
  readonly declared_trust: number;
  readonly observed_trust: number;
  readonly verified_trust: number;
  readonly trust_index: number;
  readonly trust_level: TrustLevel;
}

/**
 * Result of certificate and identity attestation verification for a single node.
 */
export interface CertificateAttestationResult {
  readonly node_id: string;
  readonly valid: boolean;
  readonly reason?: string;
  readonly certificate_valid: boolean;
  readonly commitment_verified: boolean;
  readonly trust_anchor_associated: boolean;
}

/**
 * Trust proof: deterministic hash over evaluated nodes and trust summary.
 */
export interface TrustProof {
  readonly trust_hash: string;
  readonly timestamp: number;
  readonly evaluated_nodes: readonly string[];
  readonly trust_summary: TrustSummary;
}

/**
 * Summary statistics for the trust evaluation (deterministic, auditable). Phase 11D.1 extended.
 */
export interface TrustSummary {
  readonly total_nodes: number;
  readonly valid_attestation_count: number;
  readonly average_trust_index: number;
  readonly highest_trust_node: string;
  readonly lowest_trust_node: string;
  readonly verified_node_count: number;
  readonly untrusted_node_count: number;
}

/**
 * Federated trust report: audit-grade, hashable, serializable.
 */
export interface FederatedTrustReport {
  readonly node_trust_indices: readonly NodeTrustIndex[];
  readonly attestation_results: readonly CertificateAttestationResult[];
  readonly trust_proof: TrustProof;
  readonly report_hash: string;
}
