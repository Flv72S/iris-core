/**
 * Phase 13E — Trust Recovery Framework. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  TrustState,
  RecoveryActionType,
  evaluateRecoveryPolicy,
  processAnomalyReports,
} from '../index.js';
import type { AnomalyReport } from '../../anomaly_detection/index.js';
import { AnomalyType } from '../../anomaly_detection/index.js';
import type { NodeReputationProfile } from '../../reputation_engine/index.js';
import type { NodeTrustState } from '../recovery_types.js';

function anomaly(node_id: string, anomaly_type: AnomalyType, score: number, ts: number): AnomalyReport {
  return Object.freeze({ node_id, anomaly_type, anomaly_score: score, detection_timestamp: ts });
}

function rep(node_id: string, reputation_score: number, last_updated: number): NodeReputationProfile {
  return Object.freeze({ node_id, reputation_score, last_updated });
}

function state(node_id: string, trust_state: TrustState, reputation_score: number, ts: number): NodeTrustState {
  return Object.freeze({ node_id, trust_state, reputation_score, state_timestamp: ts });
}

describe('Trust Recovery Framework (13E)', () => {
  it('Test 1 — Probation Entry: ACTIVITY_OUTLIER → node enters PROBATION', () => {
    const an = anomaly('n1', AnomalyType.ACTIVITY_OUTLIER, 0.8, 1000);
    const reputation = rep('n1', 0.6, 1000);
    assert.strictEqual(evaluateRecoveryPolicy(an, reputation), RecoveryActionType.ENTER_PROBATION);

    const current = state('n1', TrustState.TRUSTED, 0.6, 900);
    const result = processAnomalyReports([an], [reputation], [current], 1100);
    const act = result.actions.find((a) => a.node_id === 'n1' && a.action_type === RecoveryActionType.ENTER_PROBATION);
    assert.ok(act);
    const st = result.updated_states.find((s) => s.node_id === 'n1');
    assert.strictEqual(st?.trust_state, TrustState.PROBATION);
  });

  it('Test 2 — Cooldown Application: CONSENSUS_MANIPULATION → node enters COOLDOWN', () => {
    const an = anomaly('n2', AnomalyType.CONSENSUS_MANIPULATION, 0.9, 2000);
    const reputation = rep('n2', 0.5, 2000);
    assert.strictEqual(evaluateRecoveryPolicy(an, reputation), RecoveryActionType.APPLY_COOLDOWN);

    const current = state('n2', TrustState.TRUSTED, 0.5, 1900);
    const result = processAnomalyReports([an], [reputation], [current], 2100);
    const st = result.updated_states.find((s) => s.node_id === 'n2');
    assert.strictEqual(st?.trust_state, TrustState.COOLDOWN);
  });

  it('Test 3 — Node Restriction: TRUST_COLLUSION_CLUSTER → node becomes RESTRICTED', () => {
    const an = anomaly('n3', AnomalyType.TRUST_COLLUSION_CLUSTER, 0.85, 3000);
    const reputation = rep('n3', 0.4, 3000);
    assert.strictEqual(evaluateRecoveryPolicy(an, reputation), RecoveryActionType.RESTRICT_NODE);

    const current = state('n3', TrustState.TRUSTED, 0.4, 2900);
    const result = processAnomalyReports([an], [reputation], [current], 3100);
    const st = result.updated_states.find((s) => s.node_id === 'n3');
    assert.strictEqual(st?.trust_state, TrustState.RESTRICTED);
  });

  it('Test 4 — Trust Restoration: no anomalies → COOLDOWN → PROBATION → TRUSTED', () => {
    const reputations: NodeReputationProfile[] = [
      rep('a', 0.6, 4000),
      rep('b', 0.7, 4000),
    ];
    const current_states: NodeTrustState[] = [
      state('a', TrustState.COOLDOWN, 0.6, 3900),
      state('b', TrustState.PROBATION, 0.7, 3900),
    ];
    const result = processAnomalyReports([], reputations, current_states, 4100);

    const stateA = result.updated_states.find((s) => s.node_id === 'a');
    const stateB = result.updated_states.find((s) => s.node_id === 'b');
    assert.strictEqual(stateA?.trust_state, TrustState.PROBATION);
    assert.strictEqual(stateB?.trust_state, TrustState.TRUSTED);

    const restoreActions = result.actions.filter((a) => a.action_type === RecoveryActionType.RESTORE_TRUST);
    assert.ok(restoreActions.length >= 2);
  });

  it('Test 5 — Determinism: identical inputs → identical outputs', () => {
    const an = anomaly('d1', AnomalyType.SYBIL_INDICATOR, 0.7, 5000);
    const reputations = [rep('d1', 0.5, 5000)];
    const current_states = [state('d1', TrustState.TRUSTED, 0.5, 4900)];

    const r1 = processAnomalyReports([an], reputations, current_states, 5100);
    const r2 = processAnomalyReports([an], reputations, current_states, 5100);

    assert.strictEqual(r1.actions.length, r2.actions.length);
    assert.deepStrictEqual(
      r1.actions.map((a) => ({ node_id: a.node_id, action_type: a.action_type })),
      r2.actions.map((a) => ({ node_id: a.node_id, action_type: a.action_type }))
    );
    assert.strictEqual(r1.updated_states.length, r2.updated_states.length);
    assert.deepStrictEqual(
      r1.updated_states.map((s) => ({ node_id: s.node_id, trust_state: s.trust_state })),
      r2.updated_states.map((s) => ({ node_id: s.node_id, trust_state: s.trust_state }))
    );
  });
});
