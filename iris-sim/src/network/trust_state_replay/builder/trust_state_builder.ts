/**
 * Microstep 10H — Governance Trust State Replay Engine. Trust state builder.
 */

import type { TrustNode, TrustEdge, GovernanceTrustGraph } from '../../trust_graph/types/trust_graph_types.js';
import type { TrustDecision } from '../../trust_policy/types/trust_policy_types.js';
import type { TrustEvent, TrustEventPayload } from '../../trust_event_log/types/trust_event_types.js';
import { sortEdgesDeterministically } from '../../trust_graph/utils/graph_utils.js';
import { computeTrustScores } from '../../trust_graph/scoring/trust_score_engine.js';

/**
 * Mutable state builder for replay. Apply events in order to build graph and decisions.
 */
export class TrustStateBuilder {
  private nodes = new Map<string, TrustNode>();
  private edges: TrustEdge[] = [];
  private decisions: TrustDecision[] = [];

  /**
   * Apply CROSS_NODE_VERIFICATION: add edge from payload.source to metadata.target_node with certificate_id.
   */
  applyVerificationEvent(event: TrustEvent, payload: TrustEventPayload): void {
    const source = payload.source;
    const target = (payload.metadata?.target_node as string) ?? (payload.reference_id as string);
    const certificate_id = (payload.metadata?.certificate_id as string) ?? event.event_id;
    if (!source || !target) return;
    this.ensureNode(source, (payload.metadata?.source_public_key as string) ?? '');
    this.ensureNode(target, (payload.metadata?.target_public_key as string) ?? '');
    const edge: TrustEdge = {
      source_node: source,
      target_node: target,
      certificate_id,
      reason: 'verified',
    };
    if (!this.edges.some((e) => e.source_node === edge.source_node && e.target_node === edge.target_node && e.certificate_id === edge.certificate_id)) {
      this.edges.push(edge);
    }
  }

  /**
   * Apply TRUST_GRAPH_UPDATED: merge or set graph from metadata (nodes/edges arrays).
   */
  applyGraphUpdate(_event: TrustEvent, payload: TrustEventPayload): void {
    const nodesArr = payload.metadata?.nodes as Array<{ node_id: string; public_key: string }> | undefined;
    const edgesArr = payload.metadata?.edges as Array<{ source_node: string; target_node: string; certificate_id: string }> | undefined;
    if (nodesArr) {
      for (const n of nodesArr) {
        this.nodes.set(n.node_id, { node_id: n.node_id, public_key: n.public_key ?? '' });
      }
    }
    if (edgesArr) {
      for (const e of edgesArr) {
        this.ensureNode(e.source_node, '');
        this.ensureNode(e.target_node, '');
        this.edges.push({
          source_node: e.source_node,
          target_node: e.target_node,
          certificate_id: e.certificate_id,
          reason: 'verified',
        });
      }
    }
  }

  /**
   * Apply TRUST_POLICY_DECISION: append decision from metadata.
   */
  applyPolicyDecision(_event: TrustEvent, payload: TrustEventPayload): void {
    const node_id = (payload.metadata?.node_id as string) ?? payload.reference_id;
    const decision = (payload.metadata?.decision as 'ACCEPT' | 'REJECT') ?? 'ACCEPT';
    const policy_id = (payload.metadata?.policy_id as string) ?? 'replay';
    if (node_id) {
      this.decisions.push(Object.freeze({ node_id, decision, policy_id }));
    }
  }

  /**
   * Apply TRUST_SNAPSHOT_CREATED: no state change (snapshot is for verification).
   */
  applySnapshotEvent(_event: TrustEvent, _payload: TrustEventPayload): void {
    // No-op; snapshot verification is done separately
  }

  private ensureNode(node_id: string, public_key: string): void {
    if (!this.nodes.has(node_id)) {
      this.nodes.set(node_id, { node_id, public_key });
    }
  }

  /**
   * Build final ReplayState (graph with sorted edges, computed scores, decisions).
   */
  build(): { trust_graph: GovernanceTrustGraph; trust_scores: ReturnType<typeof computeTrustScores>; decisions: TrustDecision[] } {
    const sortedEdges = sortEdgesDeterministically(this.edges);
    const trust_graph: GovernanceTrustGraph = Object.freeze({
      nodes: new Map(this.nodes),
      edges: sortedEdges,
    });
    const trust_scores = computeTrustScores(trust_graph);
    return {
      trust_graph,
      trust_scores,
      decisions: [...this.decisions],
    };
  }
}
