/**
 * Phase 13H — Network Trust Observatory. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  computeNetworkHealth,
  analyzeTrustDistribution,
  analyzeAnomalyActivity,
  generateNetworkObservatoryReport,
} from '../index.js';
import type { NodeReputationProfile } from '../../reputation_engine/index.js';
import type { AnomalyReport } from '../../anomaly_detection/index.js';
import { AnomalyType } from '../../anomaly_detection/index.js';
import type { NodeTrustState } from '../../trust_recovery/index.js';
import { TrustState } from '../../trust_recovery/index.js';
import type { TrustGovernanceEvent } from '../../trust_governance_bridge/index.js';
import type { TrustGraph } from '../../reputation_trust_graph/index.js';

function rep(node_id: string, reputation_score: number, last_updated: number): NodeReputationProfile {
  return Object.freeze({ node_id, reputation_score, last_updated });
}

function anomaly(node_id: string, anomaly_type: AnomalyType, score: number, ts: number): AnomalyReport {
  return Object.freeze({ node_id, anomaly_type, anomaly_score: score, detection_timestamp: ts });
}

function state(node_id: string, trust_state: TrustState, reputation_score: number, ts: number): NodeTrustState {
  return Object.freeze({ node_id, trust_state, reputation_score, state_timestamp: ts });
}

function emptyGraph(): TrustGraph {
  return { nodes: new Map(), edges: [] };
}

describe('Network Trust Observatory (13H)', () => {
  it('Test 1 — Network Health Metrics: 10 nodes, correct average and anomaly rate', () => {
    const reputations: NodeReputationProfile[] = [];
    for (let i = 0; i < 10; i++) {
      reputations.push(rep(`n${i}`, 0.3 + (i * 0.07), 1000));
    }
    const anomalies: AnomalyReport[] = [anomaly('n0', AnomalyType.ACTIVITY_OUTLIER, 0.8, 1000)];
    const recovery_states: NodeTrustState[] = reputations.map((r) =>
      state(r.node_id, TrustState.TRUSTED, r.reputation_score, 1000)
    );
    const governance_events: TrustGovernanceEvent[] = [];

    const health = computeNetworkHealth(
      reputations,
      anomalies,
      recovery_states,
      governance_events,
      1100
    );

    assert.strictEqual(health.total_nodes, 10);
    const expectedAvg = reputations.reduce((s, r) => s + r.reputation_score, 0) / 10;
    assert.strictEqual(health.average_reputation, expectedAvg);
    assert.strictEqual(health.anomaly_rate, 1 / 10);
  });

  it('Test 2 — Trust Distribution: sorted distribution, correct min/max/median', () => {
    const reputations: NodeReputationProfile[] = [
      rep('a', 0.9, 1000),
      rep('b', 0.1, 1000),
      rep('c', 0.5, 1000),
    ];
    const report = analyzeTrustDistribution(reputations, 2000);

    assert.deepStrictEqual(report.reputation_distribution, [0.1, 0.5, 0.9]);
    assert.strictEqual(report.min_reputation, 0.1);
    assert.strictEqual(report.max_reputation, 0.9);
    assert.strictEqual(report.median_reputation, 0.5);
    assert.strictEqual(report.high_trust_nodes, 1);
    assert.strictEqual(report.low_trust_nodes, 1);
  });

  it('Test 3 — Anomaly Activity: multiple types, correct grouping', () => {
    const anomalies: AnomalyReport[] = [
      anomaly('n1', AnomalyType.SYBIL_INDICATOR, 0.8, 3000),
      anomaly('n2', AnomalyType.SYBIL_INDICATOR, 0.9, 3000),
      anomaly('n3', AnomalyType.CONSENSUS_MANIPULATION, 0.7, 3000),
    ];
    const report = analyzeAnomalyActivity(anomalies, 3100);

    assert.strictEqual(report.total_anomalies, 3);
    assert.strictEqual(report.affected_nodes, 3);
    const byType = report.anomalies_by_type;
    assert.ok(byType.get(String(AnomalyType.SYBIL_INDICATOR)) === 2);
    assert.ok(byType.get(String(AnomalyType.CONSENSUS_MANIPULATION)) === 1);
  });

  it('Test 4 — Deterministic Results: identical inputs → identical outputs', () => {
    const reputations: NodeReputationProfile[] = [rep('x', 0.6, 4000), rep('y', 0.4, 4000)];
    const anomalies: AnomalyReport[] = [anomaly('x', AnomalyType.ACTIVITY_OUTLIER, 0.5, 4000)];
    const trust_states: NodeTrustState[] = [
      state('x', TrustState.PROBATION, 0.6, 4000),
      state('y', TrustState.TRUSTED, 0.4, 4000),
    ];
    const governance_events: TrustGovernanceEvent[] = [];
    const graph = emptyGraph();

    const r1 = generateNetworkObservatoryReport(
      reputations,
      graph,
      anomalies,
      trust_states,
      governance_events,
      4100
    );
    const r2 = generateNetworkObservatoryReport(
      reputations,
      graph,
      anomalies,
      trust_states,
      governance_events,
      4100
    );

    assert.strictEqual(r1.health.total_nodes, r2.health.total_nodes);
    assert.strictEqual(r1.health.average_reputation, r2.health.average_reputation);
    assert.deepStrictEqual(r1.distribution.reputation_distribution, r2.distribution.reputation_distribution);
    assert.strictEqual(r1.anomaly_activity.total_anomalies, r2.anomaly_activity.total_anomalies);
  });
});
