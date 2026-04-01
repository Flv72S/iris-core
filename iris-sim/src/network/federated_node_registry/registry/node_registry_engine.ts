/**
 * Phase 11B — Node registry core: register, update, revoke.
 * Stateless: all operations take registry and return new registry + audit entry.
 */

import type { FederatedNodeRegistry, FederatedNodeRecord } from '../types/federated_node_registry_types.js';
import { FEDERATED_REGISTRY_SCHEMA_VERSION } from '../types/federated_node_registry_types.js';
import { hashRegistryPayload } from '../hashing/registry_hash.js';
import { computeNodeIdentityCommitment } from '../hashing/node_identity_commitment.js';
import { verifyGovernanceCertificate } from '../certificates/certificate_verifier.js';
import { createRegistryAuditEntry } from '../audit/registry_audit_log.js';
import type { RegistryAuditEntry } from '../types/federated_node_registry_types.js';

/** Input for registration: record without node_identity_commitment (computed inside). */
export type FederatedNodeRecordRegistrationInput = Omit<FederatedNodeRecord, 'node_identity_commitment'>;

/**
 * Create an empty registry (initial state).
 */
export function createEmptyRegistry(): FederatedNodeRegistry {
  const nodes: FederatedNodeRecord[] = [];
  const trust_anchors: readonly never[] = [];
  const registry_hash = hashRegistryPayload({ nodes, trust_anchors, registry_version: FEDERATED_REGISTRY_SCHEMA_VERSION });
  return Object.freeze({ nodes, trust_anchors, registry_version: FEDERATED_REGISTRY_SCHEMA_VERSION, registry_hash });
}

/**
 * Register a federated node. Validates certificate and trust anchor; computes and stores node_identity_commitment; returns new registry and audit entry.
 */
export function registerFederatedNode(
  registry: FederatedNodeRegistry,
  record: FederatedNodeRecordRegistrationInput,
  actor: string,
  asOfTime: number = Date.now()
): { registry: FederatedNodeRegistry; auditEntry: RegistryAuditEntry } {
  if (registry.nodes.some((n) => n.node_id === record.node_id)) {
    throw new Error('node_already_registered');
  }
  const verification = verifyGovernanceCertificate(record.certificate, registry.trust_anchors, asOfTime);
  if (!verification.valid) {
    throw new Error(verification.reason ?? 'certificate_invalid');
  }
  const node_identity_commitment = computeNodeIdentityCommitment(
    record.node_id,
    record.certificate.public_key,
    record.trust_anchor_id,
    record.certificate.certificate_hash
  );
  const fullRecord: FederatedNodeRecord = Object.freeze({
    ...record,
    node_identity_commitment,
  });
  const newNodes = [...registry.nodes, fullRecord].sort((a, b) => a.node_id.localeCompare(b.node_id));
  const newHash = hashRegistryPayload({ nodes: newNodes, trust_anchors: registry.trust_anchors, registry_version: registry.registry_version });
  const newRegistry: FederatedNodeRegistry = Object.freeze({
    nodes: newNodes,
    trust_anchors: registry.trust_anchors,
    registry_version: registry.registry_version,
    registry_hash: newHash,
  });
  const auditEntry = createRegistryAuditEntry('register', fullRecord.node_id, actor, registry.registry_hash, newHash, asOfTime);
  return { registry: newRegistry, auditEntry };
}

/**
 * Update a federated node (allowed fields: node_name, protocol_version, governance_role; optional certificate, trust_anchor_id).
 * If certificate or trust_anchor_id changes, node_identity_commitment is recomputed.
 */
export function updateFederatedNode(
  registry: FederatedNodeRegistry,
  node_id: string,
  updates: Partial<Pick<FederatedNodeRecord, 'node_name' | 'protocol_version' | 'governance_role' | 'certificate' | 'trust_anchor_id'>>,
  actor: string,
  asOfTime: number = Date.now()
): { registry: FederatedNodeRegistry; auditEntry: RegistryAuditEntry } {
  const idx = registry.nodes.findIndex((n) => n.node_id === node_id);
  if (idx < 0) throw new Error('node_not_found');
  const existing = registry.nodes[idx];
  if (existing.node_status !== 'active') throw new Error('cannot_update_revoked_or_suspended');
  const newCert = updates.certificate ?? existing.certificate;
  const newTrustAnchorId = updates.trust_anchor_id ?? existing.trust_anchor_id;
  const certificateChanged = newCert !== existing.certificate || newTrustAnchorId !== existing.trust_anchor_id;
  const node_identity_commitment = certificateChanged
    ? computeNodeIdentityCommitment(node_id, newCert.public_key, newTrustAnchorId, newCert.certificate_hash)
    : existing.node_identity_commitment;
  const updated: FederatedNodeRecord = Object.freeze({
    ...existing,
    node_name: updates.node_name ?? existing.node_name,
    protocol_version: updates.protocol_version ?? existing.protocol_version,
    governance_role: updates.governance_role ?? existing.governance_role,
    certificate: newCert,
    trust_anchor_id: newTrustAnchorId,
    last_update_timestamp: asOfTime,
    node_identity_commitment,
  });
  const newNodes = [...registry.nodes];
  newNodes[idx] = updated;
  newNodes.sort((a, b) => a.node_id.localeCompare(b.node_id));
  const newHash = hashRegistryPayload({ nodes: newNodes, trust_anchors: registry.trust_anchors, registry_version: registry.registry_version });
  const newRegistry: FederatedNodeRegistry = Object.freeze({
    nodes: newNodes,
    trust_anchors: registry.trust_anchors,
    registry_version: registry.registry_version,
    registry_hash: newHash,
  });
  const auditEntry = createRegistryAuditEntry('update', node_id, actor, registry.registry_hash, newHash, asOfTime);
  return { registry: newRegistry, auditEntry };
}

/**
 * Revoke a federated node (sets node_status = 'revoked').
 */
export function revokeFederatedNode(
  registry: FederatedNodeRegistry,
  node_id: string,
  actor: string,
  asOfTime: number = Date.now()
): { registry: FederatedNodeRegistry; auditEntry: RegistryAuditEntry } {
  const idx = registry.nodes.findIndex((n) => n.node_id === node_id);
  if (idx < 0) throw new Error('node_not_found');
  const existing = registry.nodes[idx];
  const updated: FederatedNodeRecord = Object.freeze({
    ...existing,
    node_status: 'revoked',
    last_update_timestamp: asOfTime,
  });
  const newNodes = [...registry.nodes];
  newNodes[idx] = updated;
  const newHash = hashRegistryPayload({ nodes: newNodes, trust_anchors: registry.trust_anchors, registry_version: registry.registry_version });
  const newRegistry: FederatedNodeRegistry = Object.freeze({
    nodes: newNodes,
    trust_anchors: registry.trust_anchors,
    registry_version: registry.registry_version,
    registry_hash: newHash,
  });
  const auditEntry = createRegistryAuditEntry('revoke', node_id, actor, registry.registry_hash, newHash, asOfTime);
  return { registry: newRegistry, auditEntry };
}
