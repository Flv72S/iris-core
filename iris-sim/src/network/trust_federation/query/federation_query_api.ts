/**
 * Microstep 10K — Governance Trust Federation Engine. Federation query API.
 */

import type { FederationSnapshot, FederatedNode, FederatedTrustEdge } from '../types/federation_types.js';

/**
 * Get federated nodes from snapshot.
 */
export function getFederatedNodes(snapshot: FederationSnapshot): FederatedNode[] {
  return [...snapshot.graph.nodes];
}

/**
 * Get federated edges from snapshot.
 */
export function getFederatedEdges(snapshot: FederationSnapshot): FederatedTrustEdge[] {
  return [...snapshot.graph.edges];
}

/**
 * Get federation snapshot hash.
 */
export function getFederationSnapshotHash(snapshot: FederationSnapshot): string {
  return snapshot.snapshot_hash;
}
