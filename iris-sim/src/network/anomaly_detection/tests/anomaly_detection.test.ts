/**
 * Phase 13D — Anomaly Detection Engine. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  detectActivityOutliers,
  detectConsensusManipulation,
  detectTrustCollusion,
  detectSybilPatterns,
  detectNetworkAnomalies,
  AnomalyType,
} from '../index.js';
import type { NormalizedBehaviorMetrics } from '../../trust_normalization/index.js';
import type { NodeBehaviorProfile } from '../../behavior_monitoring/index.js';
import type { NodeReputationProfile } from '../../reputation_engine/index.js';
import type { TrustGraph, TrustEdge } from '../../reputation_trust_graph/index.js';

function metrics(
  node_id: string,
  activity: number,
  consensus: number,
  validation: number,
  governance: number,
  baseline: number,
  ts: number
): NormalizedBehaviorMetrics {
  return Object.freeze({
    node_id,
    normalized_activity_score: activity,
    normalized_consensus_score: consensus,
    normalized_validation_score: validation,
    normalized_governance_score: governance,
    activity_baseline: baseline,
    normalization_timestamp: ts,
  });
}

function profile(
  node_id: string,
  total_events: number,
  action_count: number,
  consensus_votes: number,
  validations: number,
  governance: number,
  last_ts: number
): NodeBehaviorProfile {
  return Object.freeze({
    node_id,
    total_events,
    action_count,
    consensus_votes,
    validations_performed: validations,
    governance_actions: governance,
    last_activity_timestamp: last_ts,
  });
}

function rep(node_id: string, reputation_score: number, last_updated: number): NodeReputationProfile {
  return Object.freeze({ node_id, reputation_score, last_updated });
}

function makeGraph(
  nodeIds: string[],
  edges: { from: string; to: string; weight: number }[]
): TrustGraph {
  const nodes = new Map<string, { node_id: string; reputation_score: number }>();
  for (const id of nodeIds) nodes.set(id, { node_id: id, reputation_score: 0.5 });
  const edgeList: TrustEdge[] = edges.map((e) =>
    Object.freeze({ from_node: e.from, to_node: e.to, trust_weight: e.weight })
  );
  return { nodes, edges: edgeList };
}

describe('Anomaly Detection Engine (13D)', () => {
  it('Test 1 — Activity Outlier: extreme activity node detected', () => {
    const list: NormalizedBehaviorMetrics[] = [
      metrics('n1', 0.2, 0.2, 0.2, 0.1, 10, 1000),
      metrics('n2', 0.2, 0.25, 0.2, 0.1, 10, 1000),
      metrics('n3', 0.2, 0.22, 0.2, 0.1, 10, 1000),
      metrics('n4', 0.2, 0.2, 0.2, 0.1, 10, 1000),
      metrics('n5', 0.2, 0.2, 0.2, 0.1, 10, 1000),
      metrics('n6', 0.2, 0.2, 0.2, 0.1, 10, 1000),
      metrics('n7', 0.95, 0.2, 0.2, 0.1, 10, 1000),
    ];
    const reports = detectActivityOutliers(list, 2000);
    assert.ok(reports.length >= 1);
    const outlier = reports.find((r) => r.node_id === 'n7');
    assert.ok(outlier);
    assert.strictEqual(outlier!.anomaly_type, AnomalyType.ACTIVITY_OUTLIER);
  });

  it('Test 2 — Consensus Manipulation: consensus_votes ≈ total_events detected', () => {
    const profiles: NodeBehaviorProfile[] = [
      profile('c1', 100, 5, 95, 0, 0, 1000),
      profile('c2', 20, 2, 5, 2, 1, 1000),
    ];
    const normMetrics = [
      metrics('c1', 0.5, 0.95, 0, 0, 50, 1000),
      metrics('c2', 0.2, 0.25, 0.1, 0.05, 50, 1000),
    ];
    const reports = detectConsensusManipulation(profiles, normMetrics, 2000);
    assert.ok(reports.some((r) => r.node_id === 'c1' && r.anomaly_type === AnomalyType.CONSENSUS_MANIPULATION));
  });

  it('Test 3 — Trust Collusion: cluster with only internal trust detected', () => {
    const graph = makeGraph(['a', 'b', 'c'], [
      { from: 'a', to: 'b', weight: 0.9 },
      { from: 'b', to: 'a', weight: 0.9 },
      { from: 'b', to: 'c', weight: 0.9 },
      { from: 'c', to: 'b', weight: 0.9 },
      { from: 'a', to: 'c', weight: 0.9 },
      { from: 'c', to: 'a', weight: 0.9 },
    ]);
    const reps = [rep('a', 0.8, 1000), rep('b', 0.8, 1000), rep('c', 0.8, 1000)];
    const reports = detectTrustCollusion(graph, reps, 2000);
    assert.ok(reports.length >= 1);
    assert.ok(reports.every((r) => r.anomaly_type === AnomalyType.TRUST_COLLUSION_CLUSTER));
  });

  it('Test 4 — Sybil Detection: identical metrics, reputations, mutual trust', () => {
    const m = 0.5;
    const r = 0.6;
    const normMetrics: NormalizedBehaviorMetrics[] = [
      metrics('s1', m, m, m, m, 10, 1000),
      metrics('s2', m, m, m, m, 10, 1000),
    ];
    const reps: NodeReputationProfile[] = [rep('s1', r, 1000), rep('s2', r, 1000)];
    const graph = makeGraph(['s1', 's2'], [
      { from: 's1', to: 's2', weight: 0.9 },
      { from: 's2', to: 's1', weight: 0.9 },
    ]);
    const reports = detectSybilPatterns(normMetrics, reps, graph, 2000);
    assert.ok(reports.length >= 1);
    assert.ok(reports.some((r) => r.anomaly_type === AnomalyType.SYBIL_INDICATOR));
  });

  it('Test 5 — Determinism: same inputs → identical reports', () => {
    const profiles: NodeBehaviorProfile[] = [
      profile('d1', 50, 10, 25, 10, 5, 1000),
      profile('d2', 30, 5, 15, 5, 5, 1000),
    ];
    const normMetrics: NormalizedBehaviorMetrics[] = [
      metrics('d1', 0.5, 0.5, 0.2, 0.1, 40, 1000),
      metrics('d2', 0.3, 0.5, 0.17, 0.17, 40, 1000),
    ];
    const reputations: NodeReputationProfile[] = [rep('d1', 0.6, 1000), rep('d2', 0.4, 1000)];
    const graph = makeGraph(['d1', 'd2'], []);

    const r1 = detectNetworkAnomalies(profiles, normMetrics, reputations, graph, 3000);
    const r2 = detectNetworkAnomalies(profiles, normMetrics, reputations, graph, 3000);
    assert.strictEqual(r1.length, r2.length);
    assert.deepStrictEqual(
      r1.map((x) => ({ id: x.node_id, type: x.anomaly_type, score: x.anomaly_score })),
      r2.map((x) => ({ id: x.node_id, type: x.anomaly_type, score: x.anomaly_score }))
    );
  });
});
