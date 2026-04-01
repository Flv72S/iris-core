/**
 * Microstep 10D — Governance Trust Graph Engine. Types.
 */

export interface TrustNode {
  readonly node_id: string;
  readonly public_key: string;
}

export interface TrustEdge {
  readonly source_node: string;
  readonly target_node: string;
  readonly certificate_id: string;
  readonly reason: string;
}

export interface GovernanceTrustGraph {
  readonly nodes: ReadonlyMap<string, TrustNode>;
  readonly edges: readonly TrustEdge[];
}

export interface TrustScore {
  readonly node_id: string;
  readonly score: number;
}
