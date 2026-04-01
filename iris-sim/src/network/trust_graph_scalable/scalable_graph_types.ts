/**
 * Phase 13M — Scalable Trust Graph Engine. Graph structures.
 */

export interface GraphNode {
  readonly node_id: string;
}

/** Directed trust edge: source → target with weight in [0, 1]. */
export interface TrustEdge {
  readonly source: string;
  readonly target: string;
  readonly weight: number;
}

/** Graph container: nodes and adjacency lists (source → outgoing edges). */
export interface ScalableTrustGraph {
  readonly nodes: Map<string, GraphNode>;
  /** Outbound edges by source node id. */
  readonly edges: Map<string, TrustEdge[]>;
}
