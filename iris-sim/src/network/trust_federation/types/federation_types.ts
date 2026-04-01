/**
 * Microstep 10K — Governance Trust Federation Engine. Types.
 */

export interface FederatedNode {
  readonly node_id: string;
  readonly trust_score: number;
}

export interface FederatedTrustEdge {
  readonly source_node: string;
  readonly target_node: string;
  readonly weight: number;
}

export interface FederatedTrustGraph {
  readonly nodes: readonly FederatedNode[];
  readonly edges: readonly FederatedTrustEdge[];
}

export interface FederationSnapshot {
  readonly federation_id: string;
  readonly timestamp: number;
  readonly graph: FederatedTrustGraph;
  readonly snapshot_hash: string;
}
