/**
 * Phase 13XX-I — Trust Topology Awareness. Topology edge.
 */

export interface TopologyEdge {
  readonly source_node: string;
  readonly target_node: string;
  readonly trust_weight: number;
}
