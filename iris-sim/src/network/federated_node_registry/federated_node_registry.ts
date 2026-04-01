/**
 * Phase 11B — Federated Node Registry facade API.
 * Single entry point for registry operations and Node Consensus Engine compatibility.
 */

import type { FederatedNodeRegistry } from './types/federated_node_registry_types.js';
import type { NodeMetadata } from '../node_consensus/types/consensus_engine_types.js';
import { listActiveNodes } from './query/node_query_engine.js';

/** NodeMetadata extended with node_identity_commitment for Phase 11A. */
export type NodeMetadataWithCommitment = NodeMetadata & { readonly node_identity_commitment: string };

/**
 * Build NodeMetadata[] (with node_identity_commitment) from registry for Phase 11A Node Consensus Engine.
 * Uses active nodes only; reliability_weight defaults to 1.
 */
export function getNodeMetadataForConsensus(
  registry: FederatedNodeRegistry,
  reliabilityWeightByNode?: (node_id: string) => number
): NodeMetadataWithCommitment[] {
  const active = listActiveNodes(registry);
  return active.map((n) => ({
    node_id: n.node_id,
    trust_anchor: n.trust_anchor_id,
    protocol_version: n.protocol_version,
    governance_role: n.governance_role,
    reliability_weight: reliabilityWeightByNode ? reliabilityWeightByNode(n.node_id) : 1,
    node_identity_commitment: n.node_identity_commitment,
  }));
}
