/**
 * Phase 14A — State Model Definition. Topology state (deterministic edge IDs).
 */

import { createHash } from 'node:crypto';

export interface TopologyEdge {
  readonly edge_id: string;
  readonly source_node: string;
  readonly target_node: string;
  readonly trust_weight: number;
}

/** Deterministic edge_id: hash(source_node + ":" + target_node). Prevents duplicates, improves diff. */
export function topologyEdgeId(source_node: string, target_node: string): string {
  const payload = source_node + ':' + target_node;
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

/** Build a TopologyEdge with deterministic edge_id. */
export function createTopologyEdge(
  source_node: string,
  target_node: string,
  trust_weight: number
): TopologyEdge {
  return {
    edge_id: topologyEdgeId(source_node, target_node),
    source_node,
    target_node,
    trust_weight,
  };
}
