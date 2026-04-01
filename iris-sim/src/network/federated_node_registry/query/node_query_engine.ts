/**
 * Phase 11B — Node query engine (deterministic, serializable).
 */

import type { FederatedNodeRegistry, FederatedNodeRecord } from '../types/federated_node_registry_types.js';

/**
 * Get node by id. Returns null if not found.
 */
export function getNodeById(registry: FederatedNodeRegistry, node_id: string): FederatedNodeRecord | null {
  return registry.nodes.find((n) => n.node_id === node_id) ?? null;
}

/**
 * List all nodes (deterministically sorted by node_id).
 */
export function listNodes(registry: FederatedNodeRegistry): readonly FederatedNodeRecord[] {
  return [...registry.nodes].sort((a, b) => a.node_id.localeCompare(b.node_id));
}

/**
 * List nodes by organization (deterministically sorted by node_id).
 */
export function listNodesByOrganization(
  registry: FederatedNodeRegistry,
  organization_id: string
): readonly FederatedNodeRecord[] {
  return [...registry.nodes]
    .filter((n) => n.organization_id === organization_id)
    .sort((a, b) => a.node_id.localeCompare(b.node_id));
}

/**
 * List only active nodes (node_status === 'active'), deterministically sorted by node_id.
 */
export function listActiveNodes(registry: FederatedNodeRegistry): readonly FederatedNodeRecord[] {
  return [...registry.nodes]
    .filter((n) => n.node_status === 'active')
    .sort((a, b) => a.node_id.localeCompare(b.node_id));
}
