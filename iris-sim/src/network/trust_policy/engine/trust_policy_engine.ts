/**
 * Microstep 10E — Governance Trust Policy Engine. Core engine.
 */

import type { GovernanceTrustGraph } from '../../trust_graph/types/trust_graph_types.js';
import { computeTrustScores } from '../../trust_graph/scoring/trust_score_engine.js';
import type { TrustPolicy, TrustDecision } from '../types/trust_policy_types.js';
import { computeTrustDecision } from '../decision/trust_decision_engine.js';

/**
 * Evaluate node trust against policy using the trust graph.
 * Attestations = number of incoming edges (independent verifications).
 */
export function evaluateNodeTrust(
  policy: TrustPolicy,
  graph: GovernanceTrustGraph,
  node_id: string
): TrustDecision {
  const scores = computeTrustScores(graph);
  const scoreEntry = scores.find((s) => s.node_id === node_id);
  const trust_score = scoreEntry?.score ?? 0;
  const attestations = graph.edges.filter((e) => e.target_node === node_id).length;

  return computeTrustDecision(policy, {
    node_id,
    trust_score,
    attestations,
  });
}
