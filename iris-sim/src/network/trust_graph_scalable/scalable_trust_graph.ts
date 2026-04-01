/**
 * Phase 13M — Scalable Trust Graph Engine. Main graph class.
 * 13M.1: Policy-driven node limit, safe reverse index invalidation, deterministic snapshot.
 */

import type { GraphNode, TrustEdge } from './scalable_graph_types.js';
import type { TrustGraphPolicy } from '../trust_policy/index.js';
import { DEFAULT_TRUST_POLICY } from '../trust_policy/index.js';
import { buildReverseIndex } from './graph_storage_index.js';

/** Default max graph nodes when not specified by policy (13M.1: use policy.max_graph_nodes in engine). */
export const DEFAULT_MAX_GRAPH_NODES = 100_000;

/** Sort edges by weight DESC then target node_id for deterministic order. */
function sortEdges(edges: TrustEdge[]): TrustEdge[] {
  return [...edges].sort((a, b) => {
    const w = b.weight - a.weight;
    return w !== 0 ? w : a.target.localeCompare(b.target);
  });
}

/** Trim to maxEdges, keeping highest weight (then by target order). */
function trimToLimit(edges: TrustEdge[], maxEdges: number): TrustEdge[] {
  const sorted = sortEdges(edges);
  return sorted.slice(0, maxEdges);
}

export class ScalableTrustGraphEngine {
  private nodes: Map<string, GraphNode> = new Map();
  private adjacency: Map<string, TrustEdge[]> = new Map();
  private reverseCache: Map<string, TrustEdge[]> | null = null;
  private reverseIndexDirty = true;
  private graphVersion = 0;
  private readonly policy: TrustGraphPolicy;

  constructor(policy?: TrustGraphPolicy) {
    this.policy = policy ?? DEFAULT_TRUST_POLICY.trust_graph;
  }

  /** Current graph version; increments on addEdge/updateNodeTrust for cache invalidation. */
  getGraphVersion(): number {
    return this.graphVersion;
  }

  /** Policy used by this engine (e.g. for propagation depth and decay). */
  getPolicy(): TrustGraphPolicy {
    return this.policy;
  }

  private get maxEdgesPerNode(): number {
    return this.policy.max_edges_per_node;
  }

  private get maxGraphNodes(): number {
    return this.policy.max_graph_nodes;
  }

  private markReverseIndexDirty(): void {
    this.reverseIndexDirty = true;
    this.reverseCache = null;
  }

  addNode(node_id: string): void {
    if (this.nodes.size >= this.maxGraphNodes && !this.nodes.has(node_id)) {
      throw new Error(
        `ScalableTrustGraphEngine: maximum node count (${this.maxGraphNodes}) exceeded; cannot add node ${node_id}`
      );
    }
    this.nodes.set(node_id, Object.freeze({ node_id }));
    if (!this.adjacency.has(node_id)) {
      this.adjacency.set(node_id, []);
    }
  }

  addEdge(edge: TrustEdge): void {
    if (!this.nodes.has(edge.source)) this.addNode(edge.source);
    if (!this.nodes.has(edge.target)) this.addNode(edge.target);

    const list = this.adjacency.get(edge.source) ?? [];
    const next = trimToLimit([...list, edge], this.maxEdgesPerNode);
    this.adjacency.set(edge.source, next);
    this.graphVersion += 1;
    this.markReverseIndexDirty();
  }

  getNeighbors(node_id: string): TrustEdge[] {
    const edges = this.adjacency.get(node_id);
    return edges ?? [];
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  getEdgeCount(): number {
    let n = 0;
    for (const list of this.adjacency.values()) n += list.length;
    return n;
  }

  /**
   * Replace outbound edges for a node. Enforces edge limit (lowest-weight discarded).
   * Edges sorted by weight DESC then target node_id.
   */
  updateNodeTrust(node_id: string, new_edges: TrustEdge[]): void {
    if (!this.nodes.has(node_id)) this.addNode(node_id);
    const filtered = new_edges.filter((e) => e.source === node_id);
    const trimmed = trimToLimit(filtered, this.maxEdgesPerNode);
    this.adjacency.set(node_id, trimmed);
    this.graphVersion += 1;
    this.markReverseIndexDirty();
  }

  /** Get inbound edges. Rebuilds reverse index when dirty (after addEdge/updateNodeTrust). O(E) rebuild. */
  getInboundEdges(node_id: string): TrustEdge[] {
    if (this.reverseIndexDirty) {
      this.reverseCache = buildReverseIndex(this.adjacency);
      this.reverseIndexDirty = false;
    }
    return this.reverseCache!.get(node_id) ?? [];
  }

  /** Export current state as ScalableTrustGraph. Deterministic: nodes and edges by node_id order. */
  snapshot(): { nodes: Map<string, GraphNode>; edges: Map<string, TrustEdge[]> } {
    const sortedNodeIds = [...this.nodes.keys()].sort((a, b) => a.localeCompare(b));
    const nodes = new Map<string, GraphNode>();
    for (const id of sortedNodeIds) {
      const n = this.nodes.get(id);
      if (n) nodes.set(id, n);
    }
    const edges = new Map<string, TrustEdge[]>();
    for (const id of sortedNodeIds) {
      const list = this.adjacency.get(id);
      if (list && list.length > 0) edges.set(id, [...list]);
    }
    return { nodes, edges };
  }
}
