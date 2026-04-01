/**
 * Phase 13XX-I — Trust Topology Awareness. Lightweight topology analysis.
 */

import type { TrustGraph } from './trust_graph.js';
import type { TopologyEdge } from './topology_edge.js';

/** Build undirected adjacency: for each node, set of neighbor node_ids (from either direction). */
function undirectedNeighbors(edges: ReadonlyArray<TopologyEdge>): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    const a = e.source_node;
    const b = e.target_node;
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(b)!.add(a);
  }
  return adj;
}

/** Connected components (by node_id) using BFS. Deterministic order. */
function connectedComponents(
  nodeIds: string[],
  adj: Map<string, Set<string>>
): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];
  for (const id of nodeIds) {
    if (visited.has(id)) continue;
    const component: string[] = [];
    const queue: string[] = [id];
    visited.add(id);
    while (queue.length > 0) {
      const u = queue.shift()!;
      component.push(u);
      const neighbors = adj.get(u);
      if (neighbors) {
        for (const v of neighbors) {
          if (!visited.has(v)) {
            visited.add(v);
            queue.push(v);
          }
        }
      }
    }
    component.sort((a, b) => a.localeCompare(b));
    components.push(component);
  }
  components.sort((a, b) => (a[0] ?? '').localeCompare(b[0] ?? ''));
  return components;
}

/** Articulation points (cut vertices) via DFS: O(V+E). */
function articulationPoints(
  nodeIds: string[],
  adj: Map<string, Set<string>>
): Set<string> {
  const result = new Set<string>();
  const depth = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();
  let time = 0;

  function dfs(u: string): void {
    depth.set(u, time);
    low.set(u, time);
    time += 1;
    let childCount = 0;
    let isArticulation = false;
    const neighbors = adj.get(u);
    if (!neighbors) return;
    for (const v of neighbors) {
      if (depth.get(v) === undefined) {
        parent.set(v, u);
        childCount += 1;
        dfs(v);
        const lowU = low.get(u) ?? 0;
        const lowV = low.get(v) ?? 0;
        low.set(u, Math.min(lowU, lowV));
        if (parent.get(u) === undefined && childCount > 1) isArticulation = true;
        if (parent.get(u) !== undefined && lowV >= (depth.get(u) ?? 0)) isArticulation = true;
      } else if (v !== (parent.get(u) ?? null)) {
        const lowU = low.get(u) ?? 0;
        const depthV = depth.get(v) ?? 0;
        low.set(u, Math.min(lowU, depthV));
      }
    }
    if (isArticulation) result.add(u);
  }

  const sorted = [...nodeIds].sort((a, b) => a.localeCompare(b));
  for (const id of sorted) {
    if (depth.get(id) === undefined) dfs(id);
  }
  return result;
}

/** Incoming weight per node (sum of trust_weight for edges targeting the node). */
function incomingWeight(edges: ReadonlyArray<TopologyEdge>): Map<string, number> {
  const sum = new Map<string, number>();
  for (const e of edges) {
    const cur = sum.get(e.target_node) ?? 0;
    sum.set(e.target_node, cur + e.trust_weight);
  }
  return sum;
}

export class TopologyAnalyzer {
  /** Detect trust clusters as connected components (undirected). Returns array of node_id arrays. */
  detectClusters(graph: TrustGraph): string[][] {
    const nodeIds = [...graph.nodes.keys()].sort((a, b) => a.localeCompare(b));
    const adj = undirectedNeighbors(graph.edges);
    return connectedComponents(nodeIds, adj);
  }

  /** Find bridge nodes: articulation points in the undirected view (removal increases components). */
  findBridgeNodes(graph: TrustGraph): string[] {
    const nodeIds = [...graph.nodes.keys()].sort((a, b) => a.localeCompare(b));
    const adj = undirectedNeighbors(graph.edges);
    const bridges = articulationPoints(nodeIds, adj);
    return [...bridges].sort((a, b) => a.localeCompare(b));
  }

  /** Detect trust concentration: nodes with highest incoming trust weight (top by sum). */
  detectTrustConcentration(graph: TrustGraph): string[] {
    const byWeight = incomingWeight(graph.edges);
    const entries = [...byWeight.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return entries.map(([node_id]) => node_id);
  }
}
