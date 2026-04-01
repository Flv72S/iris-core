/**
 * Phase 11B — Registry snapshot generator (hashable, for consensus and audit).
 */

import type { FederatedNodeRegistry, RegistrySnapshot } from '../types/federated_node_registry_types.js';
import { FEDERATED_REGISTRY_SCHEMA_VERSION } from '../types/federated_node_registry_types.js';
import { hashRegistryPayload } from '../hashing/registry_hash.js';

/**
 * Build a registry snapshot (hash, counts, timestamp).
 */
export function buildRegistrySnapshot(
  registry: FederatedNodeRegistry,
  snapshot_timestamp: number = Date.now()
): RegistrySnapshot {
  const registry_hash = calculateRegistryHash(registry);
  return Object.freeze({
    registry_hash,
    node_count: registry.nodes.length,
    trust_anchor_count: registry.trust_anchors.length,
    snapshot_timestamp,
    version: FEDERATED_REGISTRY_SCHEMA_VERSION,
  });
}

/**
 * Calculate deterministic registry hash from nodes + trust_anchors + version.
 */
export function calculateRegistryHash(registry: FederatedNodeRegistry): string {
  return hashRegistryPayload({
    nodes: registry.nodes,
    trust_anchors: registry.trust_anchors,
    registry_version: registry.registry_version,
  });
}

/**
 * Verify registry snapshot: recomputed registry hash matches stored.
 */
export function verifyRegistrySnapshot(registry: FederatedNodeRegistry): boolean {
  const computed = calculateRegistryHash(registry);
  return computed === registry.registry_hash;
}
