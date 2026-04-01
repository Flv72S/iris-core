/**
 * Phase 13XX-I — Trust Topology Awareness. Topology node.
 */

export interface TopologyNode {
  readonly node_id: string;
  readonly trust_score: number;
  readonly reputation_score: number;
}
