/**
 * Phase 11B.1 — Node Identity Commitment.
 * Deterministic hash binding node_id, public_key, trust_anchor_id, certificate_hash.
 */

import type { FederatedNodeRecord } from '../types/federated_node_registry_types.js';
import { hashRegistryPayload } from './registry_hash.js';

/**
 * Compute deterministic node identity commitment.
 * Payload: { node_id, public_key, trust_anchor_id, certificate_hash } (stableStringify + SHA-256).
 */
export function computeNodeIdentityCommitment(
  nodeId: string,
  publicKey: string,
  trustAnchorId: string,
  certificateHash: string
): string {
  const payload = {
    node_id: nodeId,
    public_key: publicKey,
    trust_anchor_id: trustAnchorId,
    certificate_hash: certificateHash,
  };
  return hashRegistryPayload(payload);
}

/**
 * Verify node identity commitment: recompute and compare to stored value.
 */
export function verifyNodeIdentityCommitment(node: FederatedNodeRecord): boolean {
  const expected = computeNodeIdentityCommitment(
    node.node_id,
    node.certificate.public_key,
    node.trust_anchor_id,
    node.certificate.certificate_hash
  );
  return expected === node.node_identity_commitment;
}
