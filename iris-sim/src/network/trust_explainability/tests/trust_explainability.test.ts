/**
 * Phase 13I — Trust Explainability Engine. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  explainReputation,
  explainAnomalies,
  explainRecoveryState,
  generateNodeExplainability,
} from '../index.js';
import type { NodeReputationProfile } from '../../reputation_engine/index.js';
import type { AnomalyReport } from '../../anomaly_detection/index.js';
import { AnomalyType } from '../../anomaly_detection/index.js';
import type { NodeTrustState } from '../../trust_recovery/index.js';
import { TrustState } from '../../trust_recovery/index.js';

function rep(node_id: string, reputation_score: number, last_updated: number, previous_score?: number): NodeReputationProfile {
  return Object.freeze(
    previous_score !== undefined
      ? { node_id, reputation_score, previous_score, last_updated }
      : { node_id, reputation_score, last_updated }
  );
}

function anomaly(node_id: string, anomaly_type: AnomalyType, score: number, ts: number): AnomalyReport {
  return Object.freeze({ node_id, anomaly_type, anomaly_score: score, detection_timestamp: ts });
}

function state(node_id: string, trust_state: TrustState, reputation_score: number, ts: number): NodeTrustState {
  return Object.freeze({ node_id, trust_state, reputation_score, state_timestamp: ts });
}

describe('Trust Explainability Engine (13I)', () => {
  it('Test 1 — Reputation Explanation: positive and negative signals extracted', () => {
    const highRep = rep('n1', 0.8, 1000);
    const explHigh = explainReputation(highRep);
    assert.strictEqual(explHigh.reputation_score, 0.8);
    assert.ok(explHigh.positive_signals.length >= 1);
    assert.ok(explHigh.positive_signals.includes('reputation_above_trust_threshold'));

    const lowRep = rep('n2', 0.3, 1000);
    const explLow = explainReputation(lowRep);
    assert.ok(explLow.negative_signals.length >= 1);
    assert.ok(explLow.negative_signals.includes('reputation_below_trust_threshold'));

    const improved = rep('n3', 0.7, 1000, 0.5);
    const explImp = explainReputation(improved);
    assert.ok(explImp.positive_signals.includes('reputation_improved'));
  });

  it('Test 2 — Anomaly Explanation: correct anomaly count and types', () => {
    const anomalies: AnomalyReport[] = [
      anomaly('a1', AnomalyType.SYBIL_INDICATOR, 0.8, 2000),
      anomaly('a1', AnomalyType.SYBIL_INDICATOR, 0.9, 2000),
      anomaly('a1', AnomalyType.CONSENSUS_MANIPULATION, 0.7, 2000),
    ];
    const expl = explainAnomalies('a1', anomalies);
    assert.ok(expl !== null);
    assert.strictEqual(expl!.anomaly_count, 3);
    assert.strictEqual(expl!.anomaly_types.length, 2);
    assert.ok(expl!.anomaly_sources.length === 3);

    assert.strictEqual(explainAnomalies('nonexistent', anomalies), null);
  });

  it('Test 3 — Recovery Explanation: node in probation has correct explanation', () => {
    const node = state('r1', TrustState.PROBATION, 0.5, 3000);
    const expl = explainRecoveryState(node);
    assert.ok(expl !== null);
    assert.strictEqual(expl!.node_id, 'r1');
    assert.strictEqual(expl!.trust_state, 'PROBATION');
    assert.ok(expl!.recovery_reason.length >= 1);
    assert.strictEqual(expl!.previous_state, null);
  });

  it('Test 4 — Deterministic Results: identical inputs → identical outputs', () => {
    const reputations: NodeReputationProfile[] = [rep('d1', 0.6, 4000)];
    const anomalies: AnomalyReport[] = [anomaly('d1', AnomalyType.ACTIVITY_OUTLIER, 0.5, 4000)];
    const trust_states: NodeTrustState[] = [state('d1', TrustState.PROBATION, 0.6, 4000)];

    const r1 = generateNodeExplainability('d1', reputations, anomalies, trust_states);
    const r2 = generateNodeExplainability('d1', reputations, anomalies, trust_states);

    assert.strictEqual(r1.node_id, r2.node_id);
    assert.deepStrictEqual(r1.reputation?.positive_signals, r2.reputation?.positive_signals);
    assert.strictEqual(r1.anomaly?.anomaly_count, r2.anomaly?.anomaly_count);
    assert.strictEqual(r1.recovery?.recovery_reason, r2.recovery?.recovery_reason);
  });
});
