/**
 * Phase 11B — Federated Node Registry.
 */

export {
  FEDERATED_REGISTRY_SCHEMA_VERSION,
  type GovernanceCertificate,
  type TrustAnchor,
  type FederatedNodeRecord,
  type NodeStatus,
  type FederatedNodeRegistry,
  type RegistryAuditEntry,
  type RegistryAuditAction,
  type RegistrySnapshot,
} from './types/federated_node_registry_types.js';

export { hashRegistryPayload } from './hashing/registry_hash.js';
export { computeNodeIdentityCommitment, verifyNodeIdentityCommitment } from './hashing/node_identity_commitment.js';
export { computeCertificateHash, verifyGovernanceCertificate } from './certificates/certificate_verifier.js';
export { registerTrustAnchor, verifyTrustAnchor, listTrustAnchors, computeTrustAnchorHash } from './trust/trust_anchor_manager.js';
export {
  createEmptyRegistry,
  registerFederatedNode,
  updateFederatedNode,
  revokeFederatedNode,
  type FederatedNodeRecordRegistrationInput,
} from './registry/node_registry_engine.js';
export { getNodeById, listNodes, listNodesByOrganization, listActiveNodes } from './query/node_query_engine.js';
export { buildRegistrySnapshot, calculateRegistryHash, verifyRegistrySnapshot } from './snapshot/registry_snapshot_generator.js';
export { createRegistryAuditEntry, verifyRegistryAuditEntry } from './audit/registry_audit_log.js';
export { getNodeMetadataForConsensus, type NodeMetadataWithCommitment } from './federated_node_registry.js';
