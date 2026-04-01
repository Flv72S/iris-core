/**
 * Microstep 10L — Governance Consensus Preparation Layer. Quorum engine.
 */

import type { FederatedTrustGraph } from '../../trust_federation/types/federation_types.js';
import type { QuorumDefinition } from '../types/consensus_types.js';

const QUORUM_RATIO = 0.66;
const TRUST_THRESHOLD = 0.7;

/**
 * Compute quorum from federated graph: required_nodes = ceil(total * 0.66), trust_threshold = 0.7.
 */
export function computeQuorum(federated_graph: FederatedTrustGraph): QuorumDefinition {
  const total_nodes = federated_graph.nodes.length;
  const required_nodes = Math.max(1, Math.ceil(total_nodes * QUORUM_RATIO));
  return Object.freeze({
    required_nodes,
    trust_threshold: TRUST_THRESHOLD,
  });
}
