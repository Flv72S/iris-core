/**
 * Phase 13B — Trust Graph Engine. Graph types.
 * Directed weighted trust graph; weights 0.0 → 1.0.
 */

export interface TrustNode {
  readonly node_id: string;
  readonly reputation_score: number;
}

export interface TrustEdge {
  readonly from_node: string;
  readonly to_node: string;
  readonly trust_weight: number;
}

export interface TrustGraph {
  readonly nodes: Map<string, TrustNode>;
  readonly edges: TrustEdge[];
}
