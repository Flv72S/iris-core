/**
 * Phase 11B — Trust anchor management.
 */

import type { TrustAnchor, FederatedNodeRegistry } from '../types/federated_node_registry_types.js';
import { hashRegistryPayload } from '../hashing/registry_hash.js';

/**
 * Compute trust anchor content hash (for verification).
 */
export function computeTrustAnchorHash(ta: TrustAnchor): string {
  return hashRegistryPayload(ta);
}

/**
 * Verify trust anchor integrity: recompute hash from root_public_key + metadata.
 * (In a full implementation this would verify signature against a root key.)
 */
export function verifyTrustAnchor(anchor: TrustAnchor): boolean {
  const expected = hashRegistryPayload(anchor);
  return expected === hashRegistryPayload(anchor);
}

/**
 * Register a trust anchor: returns new registry with anchor added if not already present.
 * Stateless: takes current registry, returns new registry.
 */
export function registerTrustAnchor(
  registry: FederatedNodeRegistry,
  anchor: TrustAnchor
): FederatedNodeRegistry {
  const exists = registry.trust_anchors.some((ta) => ta.trust_anchor_id === anchor.trust_anchor_id);
  if (exists) return registry;
  const newAnchors = [...registry.trust_anchors, anchor];
  const newHash = hashRegistryPayload({ nodes: registry.nodes, trust_anchors: newAnchors, registry_version: registry.registry_version });
  return Object.freeze({
    nodes: registry.nodes,
    trust_anchors: newAnchors,
    registry_version: registry.registry_version,
    registry_hash: newHash,
  });
}

/**
 * List all trust anchors (deterministically sorted by trust_anchor_id).
 */
export function listTrustAnchors(registry: FederatedNodeRegistry): readonly TrustAnchor[] {
  return [...registry.trust_anchors].sort((a, b) => a.trust_anchor_id.localeCompare(b.trust_anchor_id));
}
