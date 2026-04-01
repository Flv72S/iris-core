/**
 * Phase 13G — Trust Governance Bridge. Deterministic escalation policies.
 */

import { AnomalyType, type AnomalyReport } from '../anomaly_detection/index.js';
import { TrustState, type NodeTrustState } from '../trust_recovery/index.js';
import type { NodeReputationProfile } from '../reputation_engine/index.js';
import { TrustEventType, type TrustGovernanceEvent } from './trust_event_types.js';
import { buildTrustEvent } from './trust_event_builder.js';

const SYBIL_NODE_THRESHOLD = 3;
const REPUTATION_COLLAPSE_THRESHOLD = 0.3;

function severityFormula(
  nodeCount: number,
  anomalyWeight: number,
  reputationImpact: number
): number {
  return Math.min(1, (nodeCount / 20) * anomalyWeight * Math.min(1, reputationImpact));
}

/**
 * Evaluate triggers from anomalies and trust state. Returns full events (with timestamp).
 */
export function evaluateGovernanceTrigger(
  anomaly_reports: readonly AnomalyReport[],
  trust_states: readonly NodeTrustState[],
  reputations: readonly NodeReputationProfile[],
  timestamp: number
): TrustGovernanceEvent[] {
  const events: TrustGovernanceEvent[] = [];
  const repMap = new Map<string, number>();
  for (const r of reputations) repMap.set(r.node_id, r.reputation_score);
  const stateMap = new Map<string, NodeTrustState>();
  for (const s of trust_states) stateMap.set(s.node_id, s);

  const sybilNodes = [...new Set(
    anomaly_reports
      .filter((a) => a.anomaly_type === AnomalyType.SYBIL_INDICATOR)
      .map((a) => a.node_id)
  )].sort();
  if (sybilNodes.length > SYBIL_NODE_THRESHOLD) {
    const avgScore = sybilNodes.length > 0
      ? anomaly_reports.filter((a) => sybilNodes.includes(a.node_id)).reduce((s, a) => s + a.anomaly_score, 0) / sybilNodes.length
      : 0;
    const avgRep = sybilNodes.reduce((s, id) => s + (repMap.get(id) ?? 0), 0) / sybilNodes.length;
    const sev = severityFormula(sybilNodes.length, avgScore, 1 - avgRep);
    events.push(buildTrustEvent(TrustEventType.SYBIL_PATTERN, sybilNodes, sev, timestamp));
  }

  const collusionNodes = [...new Set(
    anomaly_reports
      .filter((a) => a.anomaly_type === AnomalyType.TRUST_COLLUSION_CLUSTER)
      .map((a) => a.node_id)
  )].sort();
  if (collusionNodes.length > 0) {
    const avgScore = collusionNodes.length > 0
      ? anomaly_reports.filter((a) => collusionNodes.includes(a.node_id)).reduce((s, a) => s + a.anomaly_score, 0) / collusionNodes.length
      : 0;
    const avgRep = collusionNodes.reduce((s, id) => s + (repMap.get(id) ?? 0), 0) / collusionNodes.length;
    events.push(buildTrustEvent(
      TrustEventType.TRUST_GRAPH_ATTACK,
      collusionNodes,
      severityFormula(collusionNodes.length, avgScore, 1 - avgRep),
      timestamp
    ));
  }

  const consensusNodes = [...new Set(
    anomaly_reports
      .filter((a) => a.anomaly_type === AnomalyType.CONSENSUS_MANIPULATION)
      .map((a) => a.node_id)
  )].sort();
  if (consensusNodes.length > 0) {
    const avgScore = anomaly_reports.filter((a) => consensusNodes.includes(a.node_id)).reduce((s, a) => s + a.anomaly_score, 0) / consensusNodes.length;
    const avgRep = consensusNodes.reduce((s, id) => s + (repMap.get(id) ?? 0), 0) / consensusNodes.length;
    events.push(buildTrustEvent(
      TrustEventType.CONSENSUS_MANIPULATION,
      consensusNodes,
      severityFormula(consensusNodes.length, avgScore, 1 - avgRep),
      timestamp
    ));
  }

  const restrictedOrLow = trust_states.filter(
    (s) => s.trust_state === TrustState.RESTRICTED || s.reputation_score < REPUTATION_COLLAPSE_THRESHOLD
  );
  if (restrictedOrLow.length >= 2) {
    const nodes = [...restrictedOrLow].map((s) => s.node_id).sort();
    const avgRep = restrictedOrLow.reduce((s, n) => s + n.reputation_score, 0) / restrictedOrLow.length;
    events.push(buildTrustEvent(
      TrustEventType.REPUTATION_COLLAPSE,
      nodes,
      severityFormula(nodes.length, 0.8, 1 - avgRep),
      timestamp
    ));
  }

  return events;
}
