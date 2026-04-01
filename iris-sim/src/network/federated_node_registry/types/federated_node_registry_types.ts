/**
 * Phase 11B — Federated Node Registry. Data structures.
 * All structures are serializable, hashable, and verifiable.
 */

/** Schema version for registry artifacts. */
export const FEDERATED_REGISTRY_SCHEMA_VERSION = '1.0.0';

/**
 * Governance certificate for a federated node.
 */
export interface GovernanceCertificate {
  readonly certificate_id: string;
  readonly issuer: string;
  readonly issued_to_node: string;
  readonly public_key: string;
  readonly signature: string;
  readonly issued_at: number;
  readonly expires_at: number;
  readonly certificate_hash: string;
}

/**
 * Trust anchor (root of trust for an organization).
 */
export interface TrustAnchor {
  readonly trust_anchor_id: string;
  readonly organization: string;
  readonly root_public_key: string;
  readonly signature: string;
  readonly issued_at: number;
  readonly trust_level: number;
}

/** Node status in the registry. */
export type NodeStatus = 'active' | 'revoked' | 'suspended';

/**
 * Record for a federated node in the registry.
 */
export interface FederatedNodeRecord {
  readonly node_id: string;
  readonly node_name: string;
  readonly organization_id: string;
  readonly protocol_version: string;
  readonly governance_role: string;
  readonly trust_anchor_id: string;
  readonly certificate: GovernanceCertificate;
  /** Phase 11B.1 — Deterministic commitment binding node_id, public_key, trust_anchor_id, certificate_hash. */
  readonly node_identity_commitment: string;
  readonly node_status: NodeStatus;
  readonly registration_timestamp: number;
  readonly last_update_timestamp: number;
}

/**
 * Federated node registry state (immutable, hashable).
 */
export interface FederatedNodeRegistry {
  readonly nodes: readonly FederatedNodeRecord[];
  readonly trust_anchors: readonly TrustAnchor[];
  readonly registry_version: string;
  readonly registry_hash: string;
}

/** Audit action type. */
export type RegistryAuditAction = 'register' | 'update' | 'revoke' | 'trust_anchor_register';

/**
 * Single audit log entry (hashable, chainable).
 */
export interface RegistryAuditEntry {
  readonly timestamp: number;
  readonly action: RegistryAuditAction;
  readonly node_id: string;
  readonly actor: string;
  readonly previous_hash: string;
  readonly new_hash: string;
  readonly entry_hash: string;
  readonly version: string;
}

/**
 * Registry snapshot for consensus and audit (hashable).
 */
export interface RegistrySnapshot {
  readonly registry_hash: string;
  readonly node_count: number;
  readonly trust_anchor_count: number;
  readonly snapshot_timestamp: number;
  readonly version: string;
}
